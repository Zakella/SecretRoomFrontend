# SR-223 — отложка товара в магазине: контракт (сайт → webstore ⇄ RabbitMQ ⇄ админка)

Эпик SR-222. Покупатель на сайте откладывает один размер товара в одном из трёх магазинов Кишинёва на 24 ч без оплаты.
Магазин подтверждает или отклоняет в админке, покупатель приходит и покупает на кассе как обычно.

```
сайт (кнопка, диалог, /store-hold) ──REST──▶ webstore (store_hold) ──storeHoldToAppQueue──▶ админка (store_hold + stock_reservation)
                                              ▲                                                   │ резерв, подтверждение, job'ы
                                              └──────────────── storeHoldFromAppQueue ◀────────────┘
                                                          stockUpdateQueue (как сейчас) ◀───────────┘
```

## Главное решение: где живёт резерв отложки — только в админке

- Резерв отложки — строка `stock_reservation` админки (ACTIVE, quantity 1) со ссылкой `store_hold_id` вместо `order_id`.
- Остаток на сайт уходит как сейчас: `StockSyncService` шлёт `stock_balance − ACTIVE-резервы` → отложка вычитается **один раз**, в админке.
- webstore **не** увеличивает `reserved_stock` для отложек и **не** трогает `ReservationService`/`ReservationPolicy`/`OrderRepository.HOLDS_RESERVATION`.
  Сверка SR-111 (`/api/admin/reservations/reconciliation`) считает только заказы — отложки в ней не появляются и расхождений не дают.
- Почему не на сайте: при резерве на сайте (`reserved_stock`) отложку пришлось бы добавлять в `expectedAll()` и `applyFor()`
  (иначе пересчёт SR-111 её обнуляет), а покупку на кассе — снимать сообщением. Это новый путь учёта рядом с открытым SR-209
  (двойной вычет W-заказов: админка уже вычла свой резерв, сайт вычитает ещё раз). Резерв в админке не добавляет пути: тот же
  `StockReservation` → `StockSyncService`, которым уже живут W-заказы.
- Резерв ставится, когда админка получила заявку (секунды после отправки). Если админка/брокер лежат — заявка ждёт в outbox
  webstore, резерва нет, но и подтвердить её некому; после подъёма приходит и резервирует.
- Касса не проверяет резервы (их читают только StockSyncService, StockAvailabilityAuditor, ProductHistoryService) —
  продажа отложенного товара на кассе не блокируется.

### Жизненный цикл резерва (админка)
| событие | `store_hold.status` | `stock_reservation` | остаток сайта |
|---|---|---|---|
| заявка пришла, свободный остаток ≥ 1 | PENDING | ACTIVE, 1 шт. | −1 |
| заявка пришла, свободного остатка 0 | PENDING, `no_free_stock=true` | не создаётся | без изменений |
| неизвестный магазин / товар | REJECTED (reason) | не создаётся | без изменений |
| продавец подтвердил | CONFIRMED, `expires_at = confirmed_at + 24h` | ACTIVE | −1 |
| продавец отклонил | REJECTED | RELEASED | вернулся |
| не подтвердили до `confirm_deadline` (job) | NOT_CONFIRMED | RELEASED | вернулся |
| «Не пришёл» (продавец) | NO_SHOW | RELEASED | вернулся |
| 24 ч прошли (job) | EXPIRED | EXPIRED | вернулся |
| «Куплено на кассе» (продавец) | PURCHASED | FULFILLED | чек уже списал физический остаток → итог −1, не −2 |

`stock_reservation.expires_at` у отложки **не ставится** (null): иначе существующий почасовой `expireOverdueReservations`
переведёт резерв в EXPIRED мимо статуса отложки. Срок ведёт `store_hold.expires_at` и job отложек.
После каждого изменения резерва — `StockAvailabilityAuditor.auditAvailabilityForProducts([productId])` **после коммита**.

«Куплено на кассе»: продавец пробивает обычный чек, потом жмёт «Куплено». Между чеком и отметкой резерв ещё ACTIVE —
на минуты остаток сайта занижен на 1 (не завышен — товар не перепродастся). Обратный порядок (отметка до чека) на минуты
возвращает 1 шт. на сайт; в подсказке у кнопки: «Сначала пробейте чек». Связку чек ↔ отложка не делаем (не вошло).

## Сроки
- 24 ч — с подтверждения (`expires_at = confirmed_at + 24h`, ровно, без продления).
- Ожидание подтверждения — 1 ч **рабочего времени магазина** (`confirm_deadline`, считает админка):
  часы `app.store-hold.working-hours` 10:00–21:00 Europe/Chisinau, каждый день. Заявка в 20:30 → дедлайн 10:30 следующего дня,
  ночная заявка → 11:00. Иначе любая вечерняя и ночная заявка автоматически «не подтверждена».
- Конфиг админки:
```yaml
app:
  store-hold:
    enabled: ${STORE_HOLD_ENABLED:true}
    hold-duration: ${STORE_HOLD_DURATION:PT24H}
    confirm-timeout: ${STORE_HOLD_CONFIRM_TIMEOUT:PT1H}        # рабочего времени
    working-hours: { zone: Europe/Chisinau, start: "10:00", end: "21:00" }
    expire-interval-ms: ${STORE_HOLD_EXPIRE_INTERVAL_MS:300000} # job (только production, как остальные @Scheduled)
    status-retry-ms: ${STORE_HOLD_STATUS_RETRY_MS:60000}
    rooms:                                                      # код магазина сайта → rooms.id
      atrium: ${STORE_HOLD_ROOM_ATRIUM:1}
      eminescu: ${STORE_HOLD_ROOM_EMINESCU:3}
      secret-angel: ${STORE_HOLD_ROOM_SECRET_ANGEL:4}
```
  (прод 04.11: 1 Atrium Secret Room, 3 Eminescu Secret Room, 4 Secret Angel; 2 — Основной склад, 5 — Braus, продаж нет.)
- Job и на dev: `@EnableScheduling` только в production. Поэтому та же процедура просрочки вызывается ещё и при чтении
  списка «Отложено» и счётчика (ленивая просрочка) — на dev/стенде сроки тоже снимаются. Обе — идемпотентны (`FOR UPDATE`,
  переход только из PENDING/CONFIRMED).

## Магазины
Коды фиксированы: `atrium`, `eminescu`, `secret-angel`. Тексты (название, адрес, часы) — на сайте (`contacts.ts` уже их держит,
вынести в общую константу). webstore проверяет код по `store-hold.store-codes`. Адресов в `Room` не добавляем.

## REST webstore (публичный)
Все ответы `/api/v1/store-holds/**` — `Cache-Control: no-store`. Ошибки — `{ "error": "<КОД>", ... }`.
`store-hold.enabled=false` → 404 `{error: HOLD_DISABLED}` (кнопка на сайте тогда прячется).
Бот по UA (`VisitorActionController.isBot`) → 403 `BOT`. Тело > 8 КБ → 413. Поле-ловушка `website` непустое → 201 с выдуманным номером без сохранения.

### `POST /api/v1/store-holds` — заявка
```json
{ "productId": 123, "variantAppId": 456, "storeCode": "atrium",
  "firstName": "Maria", "lastName": "Popescu", "phone": "069123456", "email": "a@b.md",
  "language": "ro", "website": "" }
```
- `productId` — id карточки (= appId админки), `variantAppId` — appId размера (null у товара без размеров; тогда резерв на товар).
- Имя/фамилия — как в checkout: `^[A-Za-z\s'-]+$`, 2…50 → 400 `BAD_NAME {field}`; телефон `^0[67]\d{7}$` → 400 `BAD_PHONE`;
  email необязателен, ≤ 100, простой формат → 400 `BAD_EMAIL`; `storeCode` не из списка → 400 `BAD_STORE`; `language` ro/ru, иное → ro.
- Товар: карточка есть, на сайте (`uploadToTheSite`), не снят с продажи; размер принадлежит товару → иначе 404 `NOT_FOUND`.
  У товара есть размеры, а `variantAppId` не передан → 400 `SIZE_REQUIRED`.
  Доступный остаток (`getAvailableStock()`) < 1 → 409 `OUT_OF_STOCK`.
- Лимит: активных отложек на телефон ≥ `max-active-per-phone` (2) → 409 `LIMIT_REACHED {max:2}`.
  Активна = PENDING моложе 24 ч или CONFIRMED с `expires_at > now`. Проверка и вставка — под `pg_advisory_xact_lock(hash(phone))`
  (или FOR UPDATE), чтобы две параллельные заявки не обошли лимит.
- Частота (`SiteEventRateLimiter`, как чат SR-218): ключ `sha256(phone) + "|" + ClientIp` — 3 заявки/мин; IP — 10/мин;
  глобально 120/мин; сверх — 429 `{error: RATE_LIMIT, retryAfterSeconds: 60}` + `Retry-After`.
- Ответ 201 — вид статуса (ниже). Номер `H<id>` (последовательность webstore).

### `POST /api/v1/store-holds/status` — статус по номеру и телефону
`{ "number": "H17", "phone": "069123456" }` (POST, чтобы телефон не попал в URL и логи nginx/Cloudflare).
Номер не найден или телефон не совпал → 404 `NOT_FOUND` (одинаково, без подсказки). Лимит: 20/мин на IP, 10/мин на номер.
```json
{ "number": "H17", "status": "PENDING", "storeCode": "atrium",
  "productId": 123, "variantAppId": 456, "productName": "…", "size": "S", "price": 499.0, "imageUrl": "…",
  "firstName": "Maria",
  "createdAt": "ISO", "confirmDeadline": "ISO|null", "confirmedAt": "ISO|null", "expiresAt": "ISO|null",
  "reason": null }
```
Статусы: `PENDING` (ожидает подтверждения), `CONFIRMED` (отложено до `expiresAt`), `REJECTED`, `NOT_CONFIRMED`, `PURCHASED`, `NO_SHOW`, `EXPIRED`.
Если CONFIRMED и `expiresAt` < now (сообщение админки ещё не дошло) — отдаём `EXPIRED`.
`reason` (только для REJECTED): `NOT_IN_STORE` (продавец), `UNKNOWN_STORE`, `UNKNOWN_PRODUCT` (автоматом) — сайт показывает общий текст.

### Логи и ПДн
Телефон, имя, email в логах webstore и админки **не пишем** (только номер заявки, holdId, статус). Сообщение очереди в логи
ошибок — без тела (как `ChatReplyJsonMessageConverter`).

## RabbitMQ
Обе очереди durable, без аргументов (`new Queue(name, true)`), persistent JSON, default exchange, routing key = имя очереди.
Type-id-заголовкам не верим — приёмник читает в свой DTO. **Обе очереди объявляют оба приложения** (KB #5157).

| свойство `spring.rabbitmq.queues.*` | base | `-dev` | `-stage` |
|---|---|---|---|
| `storeHoldToApp` | `storeHoldToAppQueue` | `storeHoldToAppQueueDev` | `storeHoldToAppQueueStage` |
| `storeHoldFromApp` | `storeHoldFromAppQueue` | `storeHoldFromAppQueueDev` | `storeHoldFromAppQueueStage` |

DLQ — по образцу своего репозитория: админка `<очередь>.dlq` (как `ChatListenerConfig`), webstore `dlxExchange`/`dlqKey` (как `ChatRabbitConfig`).
`productQueue` **не используется** (KB #4818: частичная пачка снимает каталог).

### `storeHoldToAppQueue` (webstore → админка) — `StoreHoldRequestDto`
| поле | тип | смысл |
|---|---|---|
| holdId | UUID | идемпотентность (unique в админке) |
| number | string | `H17` |
| storeCode | string | atrium / eminescu / secret-angel |
| productAppId | long | `variantAppId ?? productId` = `products.id` админки (каждый размер — свой Product) |
| quantity | int | 1 |
| productName, size | string | снимок для показа, админка показывает свои данные Product |
| price | number | цена на сайте в момент заявки |
| firstName, lastName, phone, email, language | string | email и language могут быть null |
| createdAt | Instant | момент заявки на сайте |

Надёжность (как чат): строка `store_hold` с `dispatched_to_app=false`, публикация после коммита, успех → true;
планировщик раз в `store-hold.dispatch-retry-ms` (60 с) досылает. Дубли гасит unique holdId в админке.

### `storeHoldFromAppQueue` (админка → webstore) — `StoreHoldStatusDto`
| поле | тип | смысл |
|---|---|---|
| holdId | UUID | |
| number | string | |
| status | string | PENDING (заявка принята, есть дедлайн) / CONFIRMED / REJECTED / NOT_CONFIRMED / PURCHASED / NO_SHOW / EXPIRED |
| reason | string? | для REJECTED |
| confirmDeadline, confirmedAt, expiresAt | Instant? | |
| version | int | растёт на каждый переход в админке (1 = принята) |
| changedAt | Instant | |
webstore применяет, только если `version` > сохранённой (повтор и перестановка сообщений безопасны); неизвестный holdId — лог (без ПДн) и ack.
Надёжность админки — как `ChatReplyDispatcher`: флаг `site_status_sent=false` на `store_hold`, отправка после коммита, повтор job'ом.

### Письмо покупателю
Есть email — webstore после применения статуса шлёт письмо (Thymeleaf `store-hold-status`, ro/ru, `messages_*.properties`)
на CONFIRMED (до какого времени, адрес магазина), REJECTED и NOT_CONFIRMED. Ссылка на страницу статуса `<site>/<lang>/store-hold?number=H17`.
Письмо — `@Async` после коммита, ошибка письма статус не ломает.

## Админка
- REST `/api/store-holds`, роли CEO, ADMIN, Seller. Продавец видит и меняет только отложки магазинов из
  `UserService.getAvailableRoomsForCurrentUser(Store)` (пусто = все, как сейчас у пользователя).
  - `GET /api/store-holds?roomId=&scope=active|all&page=&size=` — список: номер, создано, магазин, товар (название, артикул), размер,
    имя, телефон, статус, дедлайн подтверждения / «до» (срок), `inStoreQty` (остаток этого товара в этом магазине по `RoomBalance` — подсказка продавцу),
    `noFreeStock`.
  - `GET /api/store-holds/pending-count` — число PENDING по магазинам пользователя (бейдж).
  - `POST /api/store-holds/{id}/confirm` — из PENDING; `POST …/reject` — из PENDING; `POST …/purchased` — из PENDING или CONFIRMED;
    `POST …/no-show` — из CONFIRMED. Неверный переход → 409. Кто и когда — `closed_by`, `closed_at`.
- Уведомление: бейдж и звук при росте счётчика в верхней панели и пункте меню «Отложено» — опрос `pending-count` раз в 15 с,
  как `ChatUnreadService` SR-218 (не SSE: поток `/orders/stream` шлёт всем пользователям payload заказа и не фильтруется по магазину,
  колокольчик заказов парсит каждое событие как заказ; опрос уже проверен в чате и проходит прокси без heartbeat'ов).
- Liquibase `sr-223-store-hold.xml`: таблица `store_hold`; `stock_reservation.order_id` → NULL допустим, новая `store_hold_id` FK,
  CHECK (`order_id IS NOT NULL OR store_hold_id IS NOT NULL`), индекс по `store_hold_id`.
  Места, читающие `reservation.getOrder()` (`ProductHistoryService:98`), — обработать null (показывать «Отложка H17»).
