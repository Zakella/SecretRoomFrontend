# SR-218 — чат с покупателями: контракт (сайт → webstore ⇄ RabbitMQ ⇄ админка)

> SR-220 (06.11.2026): типы сообщений TEXT / IMAGE / PRODUCT, картинки от сотрудника, карточки товаров от покупателя,
> кликабельные ссылки. Изменения — в разделе «SR-220» в конце; места выше, которые он меняет, помечены «→ SR-220».

Эпик SR-217. Переписка живёт в WebStoreBackend (источник правды для покупателя): сайт пишет и читает только
webstore, админка получает копию через RabbitMQ и отвечает через RabbitMQ. Админка или брокер лежат — покупатель
пишет как обычно, сообщения досылаются после подъёма, без потерь и дублей.

```
сайт (виджет) ──REST──▶ webstore (chat_conversation, chat_message) ──chatToAppQueue──▶ админка (chat_*)
                         ▲                                                              │
                         └──────────────────────── chatFromAppQueue ◀────────────────────┘
```

## Идентификаторы
| что | кто создаёт | где живёт | смысл |
|---|---|---|---|
| chatKey | браузер, `crypto.randomUUID()` | localStorage сайта `sr_chat_id`; на webstore — только `sha256` hex | секрет посетителя: кто знает ключ, читает диалог. В RabbitMQ, админку и логи **не попадает** |
| conversationId | webstore, UUID v4 | обе БД | id диалога в контракте |
| messageId | автор сообщения (webstore для CUSTOMER/SYSTEM, админка для STAFF), UUID v4 | обе БД, unique | идемпотентность: повтор с тем же messageId игнорируется |
| seq | webstore | webstore, в админке — как пришло | порядковый номер сообщения в диалоге (1, 2, 3…), курсор для поллинга |
| clientMessageId | браузер, UUID v4 | webstore | повтор POST после сетевого сбоя не создаёт второе сообщение |

chatKey не зависит от согласия на cookies: это необходимое хранилище для работы чата, не трекинг.

## Транспорт сайт ⇄ webstore: поллинг (не SSE)
Перед сайтом и API стоит Cloudflare (и nginx на 167): держать открытое SSE-соединение на каждую вкладку —
таймаут простоя Cloudflare 100 с (нужны heartbeat'ы), буферизация прокси, по потоку Tomcat на каждого
посетителя, переподключения на мобильных. Поллинг без состояния проходит через любой прокси, нагрузка
предсказуемая: опрашивают только посетители, у которых уже есть диалог.
- Окно чата открыто и вкладка видна — раз в 4 с.
- Окно закрыто, диалог есть (для индикатора «ответили») — раз в 30 с.
- Вкладка скрыта — опрос останавливается, при возврате — сразу один запрос.
- Диалога нет (chatKey ещё не создан) — не опрашиваем вовсе.
- Все ответы `/api/v1/chat/**` — `Cache-Control: no-store` (на `api.*/api/*` в Cloudflare может стоять Cache Rule).

## REST webstore (публичный, CORS как у остальных публичных эндпоинтов)
Ключ — заголовок `X-Chat-Key: <chatKey>` (UUID, иначе 400 `BAD_KEY`). В URL ключ не кладём: query-строки пишут
nginx и Cloudflare. CORS webstore: `X-Chat-Key` добавляется в allowed headers, `maxAge` 600 с (без него Chrome
кэширует preflight 5 с и при опросе раз в 4 с удваивает запросы; в коде стоит 3600 с — так и оставлено). Ответы ошибок: `{ "error": "<КОД>", ... }`.
Выключатель `chat.enabled=false` → 404 на все `/api/v1/chat/**` (виджет тогда прячется).

### `POST /api/v1/chat/messages` — сообщение покупателя
```json
{ "clientMessageId": "uuid", "text": "…", "name": "…", "phone": "…", "language": "ro",
  "visitorId": "uuid|null", "pageUrl": "https://secretroom.md/…", "website": "" }
```
- Нет диалога с таким chatKey — создаётся (conversationId новый).
- `text`: обрезка пробелов, управляющие символы (кроме `\n`) удаляются, 1…1000 символов; длиннее — 400 `TOO_LONG` `{max:1000}`, пусто — 400 `EMPTY`.
- `name` ≤ 100, `phone` ≤ 30 (`^[0-9+()\- ]{5,30}$`, иначе 400 `BAD_PHONE`), оба необязательны; пришли — обновляют диалог.
- `language` — `ro`/`ru`, иное → `ro`. `pageUrl` ≤ 500, без query-строки.
- `visitorId` — UUID посетителя журнала SR-207; виджет шлёт его **только при `cookie_consent` = принято**, иначе null.
  Каждое сообщение обновляет `visitor_id` диалога (null — затирает: отзыв согласия).
- Антиспам: `website` — поле-ловушка (скрыто в форме), непустое → 201 без сохранения; UA бота (`VisitorActionController.BOT_UA`, пустой UA — бот) → 403 `BOT`; больше 3 ссылок в тексте → 400 `SPAM`; тело > 8 КБ → 413.
- Повтор с тем же `clientMessageId` в диалоге → 200 с уже сохранённым сообщением (без второй записи).
- Ответ 201:
```json
{ "conversationId": "uuid", "message": { "messageId": "uuid", "seq": 7, "author": "CUSTOMER", "text": "…", "createdAt": "ISO" },
  "autoReply": { …сообщение SYSTEM… } | null }
```

### `GET /api/v1/chat/messages?after=<seq>` — новые сообщения
- Нет диалога — 200 `{ "conversationId": null, "messages": [], "unread": 0, "hasPhone": false }`.
- Иначе сообщения с `seq > after` (по возрастанию, не больше 200), `unread` — число сообщений STAFF/SYSTEM с seq больше
  прочитанного покупателем, `hasPhone` — оставлен ли телефон.
- Сообщение: `{ messageId, seq, author: CUSTOMER|STAFF|SYSTEM, text, createdAt }` (→ SR-220: + `type`, `image`, `product`). Имя сотрудника покупателю не отдаём
  (на сайте подпись «Secret Room»).

### `POST /api/v1/chat/read` — покупатель прочитал
`{ "seq": 12 }` → `customer_read_seq = max(текущий, seq)`. 204. Гасит индикатор во всех вкладках.

### `POST /api/v1/chat/contact` — имя/телефон отдельно от сообщения (форма после автоответа)
`{ "name": "…", "phone": "…" }` — те же правила. 204. Диалога нет — 404 `NO_CONVERSATION`. Шлёт событие CONTACT.

### Лимиты (свой экземпляр `SiteEventRateLimiter` на каждый; суточный на диалог — подсчётом в БД)
Ключ — `sha256(chatKey) + IP клиента` (`ClientIp`). До SR-208 IP = узел Cloudflare, поэтому одного IP мало:
иначе все покупатели окажутся под одним лимитом. Сверх — 429 `{ "error": "RATE_LIMIT", "retryAfterSeconds": 60 }`,
диалог не ломается, текст в поле ввода остаётся.
```yaml
chat:
  enabled: ${CHAT_ENABLED:true}                         # false → 404 на все /api/v1/chat/**
  max-length: ${CHAT_MAX_LENGTH:1000}
  limits:
    messages-per-minute: ${CHAT_MESSAGES_PER_MINUTE:10}   # на chatKey+IP (POST messages, contact)
    messages-per-day: ${CHAT_MESSAGES_PER_DAY:300}        # на диалог, считается по БД (CUSTOMER за 24 ч)
    total-messages-per-minute: ${CHAT_TOTAL_MESSAGES_PER_MINUTE:600}
    new-conversations-per-minute: ${CHAT_NEW_CONVERSATIONS_PER_MINUTE:60}  # глобально
    polls-per-minute: ${CHAT_POLLS_PER_MINUTE:60}         # на chatKey+IP (GET, read)
    total-polls-per-minute: ${CHAT_TOTAL_POLLS_PER_MINUTE:6000}  # глобально (GET, read)
  retention-days: ${CHAT_RETENTION_DAYS:180}
  working-hours:
    zone: ${CHAT_WORKING_ZONE:Europe/Chisinau}
    days: ${CHAT_WORKING_DAYS:MON,TUE,WED,THU,FRI,SAT,SUN}
    start: ${CHAT_WORKING_START:10:00}
    end: ${CHAT_WORKING_END:20:00}
  dispatch-retry-ms: ${CHAT_DISPATCH_RETRY_MS:60000}
```

## Нерабочее время
Сообщение покупателя вне `working-hours`, а у диалога `auto_reply_sent_at` пуст → webstore атомарно
(`UPDATE … WHERE auto_reply_sent_at IS NULL`) ставит отметку и добавляет сообщение SYSTEM на языке диалога:
- ro: «Mulțumim pentru mesaj! Acum suntem în afara programului de lucru (10:00–20:00). Vă vom răspunde în programul de lucru. Lăsați numărul de telefon — vă vom suna.»
- ru: «Спасибо за сообщение! Сейчас нерабочее время (10:00–20:00). Мы ответим в рабочее время. Оставьте номер телефона — мы перезвоним.»
Часы в тексте — из настройки. Один раз за диалог. SYSTEM-сообщение уходит в админку как обычное.
Часы — настройкой webstore, а не админки: автоответ обязан работать, когда админка лежит.

## RabbitMQ
Обе очереди durable, без аргументов (`new Queue(name, true)`), сообщения persistent, JSON (Jackson), default exchange,
routing key = имя очереди. Type-id-заголовкам не верим — приёмник читает в свой DTO.
**Обе очереди объявляют оба приложения** (одинаково, без аргументов): webstore падает на старте, если очереди,
которую он слушает, нет в брокере (KB #5157).

| свойство (`spring.rabbitmq.queues.*`) | base | `-dev` | `-stage` |
|---|---|---|---|
| `chatToApp` | `chatToAppQueue` | `chatToAppQueueDev` | `chatToAppQueueStage` |
| `chatFromApp` | `chatFromAppQueue` | `chatFromAppQueueDev` | `chatFromAppQueueStage` |

DLQ — по образцу своего репозитория: админка — `<очередь>.dlq` (как `SiteEventListenerConfig`), webstore —
`dlxExchange`/`dlqKey` (как `RabbitMQListenerConfig.createRetryInterceptor`).

### `chatToAppQueue` (webstore → админка) — `ChatEventDto`
| поле | тип | обяз. | смысл |
|---|---|---|---|
| eventType | string | да | `MESSAGE` / `CONTACT` |
| conversationId | UUID | да | |
| messageId | UUID | для MESSAGE | идемпотентность в админке |
| seq | number | для MESSAGE | |
| author | string | для MESSAGE | `CUSTOMER` / `SYSTEM` (STAFF не шлётся обратно) |
| text | string ≤ 1000 | для MESSAGE | как есть (экранирует тот, кто показывает) |
| createdAt | Instant ISO | да | |
| customerName | string ≤ 100 | нет | снимок диалога на момент события |
| customerPhone | string ≤ 30 | нет | |
| language | string | нет | ro / ru |
| visitorId | UUID | нет | только с согласием; null = нет согласия |
| pageUrl | string ≤ 500 | нет | страница, с которой написали |
Админка: неизвестный conversationId — создаёт диалог; повтор messageId — игнор; CONTACT и каждое MESSAGE обновляют
имя/телефон/visitorId/язык диалога. Неизвестный eventType — в лог и ack.

Надёжность webstore → админка (как `OrderDispatchRetryService` / `SiteEventOutboxRetryService`): сообщение сначала
пишется в `chat_message` с `dispatched_to_app = false`, после коммита — публикация; `convertAndSend` не бросил → `true`. Брокер/админка лежат — планировщик
раз в `dispatch-retry-ms` досылает недоставленные по возрастанию seq. Дубли при гонке досылки гасит unique messageId в админке.
CONTACT — тот же механизм (флаг `contact_dispatched` у диалога).

### `chatFromAppQueue` (админка → webstore) — `ChatReplyDto`
| поле | тип | обяз. | смысл |
|---|---|---|---|
| messageId | UUID | да | генерирует админка; повтор — игнор |
| conversationId | UUID | да | неизвестный — в лог и ack (диалог мог быть удалён сроком хранения) |
| text | string ≤ 2000 | да | ответ сотрудника |
| staffName | string ≤ 100 | да | кто ответил (покупателю не показывается) |
| createdAt | Instant ISO | да | когда отправлен в админке |
webstore присваивает seq и сохраняет как STAFF. Надёжность админка → webstore: ответ сначала в `chat_message` админки
со статусом `PENDING`, после коммита публикация, не бросило → `SENT`; планировщик раз в минуту досылает `PENDING`. Webstore лежит — сообщения ждут в
durable-очереди.

Обработка ошибок приёмников (обе стороны): повторы 3 раза, затем `<очередь>.dlq`; битый JSON — сразу в DLQ.

## Хранение и чистка
- webstore: `chat_conversation`, `chat_message` (Liquibase). Админка: `chat_conversation`, `chat_message` (Liquibase).
- Срок — 180 дней с последнего сообщения: диалог и сообщения удаляются планировщиком раз в сутки на обеих сторонах.
  Почему 180: покрывает возврат/обмен и гарантийные претензии по заказу (вопрос «я вам писал про…»), сезон
  повторных покупок; дольше держать имя, телефон и переписку без нужды — лишние ПДн.

## Защита
- Нигде нет `innerHTML`/`[innerHTML]`/`bypassSecurityTrust*`, переносы строк — `white-space: pre-wrap`. Ссылки (→ SR-220)
  становятся кликабельными только для `http`/`https`, разметка строится из текста шаблоном, не HTML-строкой.
  `<img src=x onerror=alert(1)>` и `<script>` показываются как текст на сайте и в админке.
- В логах обеих сторон нет имени, телефона, текста и chatKey: только conversationId/внутренний id, messageId, seq, длина.

## Админка
- Экран «Чаты» (`/chats`): слева список (непрочитанные сверху, затем по последнему сообщению), справа переписка и поле ответа.
  Доступ — любой залогиненный сотрудник (новой роли нет). У ответа — имя ответившего сотрудника.
- Непрочитанные: `unread_count` диалога растёт на каждое CUSTOMER-сообщение, обнуляется при открытии диалога
  любым сотрудником. Значок с числом диалогов с непрочитанными — в меню; звук при росте числа.
- Боковая панель «что смотрел / что в корзине» — только у диалога с visitorId (= согласие на сайте), из `site_event`
  (kind `VISITOR_ACTION`, корзина — как `SiteVisitCart`). Без visitorId блок не показывается. В панель не попадают
  телефон, имя, заказы из журнала — только страницы, поиски и корзина.
- Обновление без SSE: значок — опрос раз в 15 с, открытый диалог — раз в 3 с, список — раз в 10 с (сотрудников
  единицы, нагрузка ничтожна; второй сотрудник видит ответ первого через ≤ 3 с).
- Тексты ru/ro (Transloco; en-словаря в админке нет).

### REST админки (`api/chats`, любой залогиненный сотрудник)
| метод | путь | что |
|---|---|---|
| GET | `api/chats?page&size` | список: непрочитанные сверху, затем `last_message_at desc`; имя, телефон, превью ≤ 120, время, `unreadCount` |
| GET | `api/chats/unread` | `{ "conversations": N }` — для значка |
| GET | `api/chats/{id}/messages?afterId=` | переписка по времени (author, text, createdAt, staffName, status; → SR-220: + type, image, product) |
| POST | `api/chats/{id}/reply-image` | → SR-220: multipart `file` + `text`, картинка сотрудника |
| GET | `api/chats/{id}/attachments/{attachmentId}` | → SR-220: байты картинки |
| POST | `api/chats/{id}/read` | `unread_count = 0` |
| POST | `api/chats/{id}/reply` | `{ "text": "…" }` 1…2000 → сообщение STAFF, отправка в webstore |
| GET | `api/chats/{id}/visitor` | панель: `{ pages: [...], searches: [...], cart: [...] }` или 204 без visitorId |
Кто ответил — `staff_username` (`AuditUsername.current()`) и `staff_name` (claim `name`, иначе `given_name family_name`,
иначе username).

## Сайт (виджет `src/app/widgets/chat/`)
- Подключён в `app.html` на всех страницах, создаётся только в браузере (`isPlatformBrowser`), при SSR в разметке нет.
- Кнопка в правом нижнем углу, не перекрывает cookie-баннер и «наверх». Окно: история, поле ввода (maxlength 1000,
  счётчик), необязательные имя и телефон (свёрнуто «Представиться»), после автоответа без телефона — форма телефона.
- `sr_chat_id` в localStorage создаётся при первом отправленном сообщении (не при открытии окна) и не зависит от
  `cookie_consent`. `visitorId` (`sr_visitor_id`) уходит в сообщении только при `cookie_consent = accepted`.
- Индикатор «ответили» — точка/число на кнопке, пока `unread > 0`; открыл окно → `POST read` → гаснет.
- Ошибки: 429 — «Слишком часто, подождите минуту», 400 TOO_LONG — «Сообщение слишком длинное», сеть — «Не отправлено,
  повторить»; текст в поле остаётся. Повтор — с тем же `clientMessageId`.
- Опрос чата не включает глобальный индикатор загрузки сайта (`LoaderInterceptor`).
- 404 от `/api/v1/chat/**` (чат выключен) — кнопка не показывается.
- Тексты ro/ru (`assets/i18n/{ro,ru}.json`, оба словаря). Подпись ответов — «Secret Room», автоответа — тоже.

## SR-220 — типы сообщений, картинки, карточки товаров, ссылки

### Тип сообщения
`type`: `TEXT` | `IMAGE` | `PRODUCT`. **Нет поля или `null` = `TEXT`** — везде: в REST, в обеих очередях, в обеих БД
(колонка `type varchar(10) not null default 'TEXT'` новым changeset'ом; строки до SR-220 получают `TEXT`).
Неизвестный тип у приёмника очереди → в лог (messageId, тип) и в DLQ, как битое сообщение.

| тип | кто отправляет | `text` | вложение |
|---|---|---|---|
| TEXT | все | 1…1000 (покупатель), 1…2000 (сотрудник) | — |
| IMAGE | только STAFF | подпись 0…2000, может быть `""` | `image` |
| PRODUCT | только CUSTOMER | вопрос 0…1000, может быть `""` | `product` |

Покупатель не может прислать IMAGE (400 `BAD_TYPE`), сотрудник — PRODUCT. Превью диалога в списке админки: текст
сообщения, если он есть; иначе для PRODUCT — название товара, для IMAGE — пусто, а список отдаёт `lastMessageType`,
и фронт показывает «Фото» по i18n.

### Картинки сотрудника: где хранятся и почему
Админка проверяет и перекодирует картинку, хранит результат у себя в БД и отправляет его **внутри ответа** в
`chatFromAppQueue`; webstore хранит копию в своей БД и отдаёт покупателю сам.
- Почему не SFTP (`FileSyncService`) и не `/api/public/serveFile`: полный синк запускается вручную и перед заливкой
  стирает на сервере сайта всё, чего нет в списке товаров/героев, — картинки чата пропали бы; файл и сообщение шли
  бы разными путями (сообщение раньше файла → 404, который Cloudflare кэширует на год, KB #3785); serveFile
  публичен по имени файла и кладёт имя в `Location` без кодирования. Отдельный путь — ещё и чистка по сроку на
  чужой ФС.
- Почему в БД, а не файлом на диске: картинка — часть сообщения. Одна транзакция, досылка PENDING-ответа уже есть и
  повторяет картинку вместе с текстом, удаление по сроку 180 дней — каскадом вместе с сообщением, путей и имён файлов
  нет вовсе. Объём — единицы картинок в день по ≤ 2 МБ.
- Картинка открывается у покупателя при лежащей админке: она уже в БД webstore.

**Приём в админке** (`POST api/chats/{id}/reply-image`, multipart: `file` + необязательный `text`; любой залогиненный
сотрудник, без логина 401):
- ≤ 5 МБ (проверка до чтения тела), одна картинка на сообщение (несколько — несколькими сообщениями).
- Тип — по сигнатуре содержимого: JPEG, PNG, WebP. Имя файла и `Content-Type` части игнорируются. SVG, HTML, GIF,
  AVIF и всё прочее → 400 `UNSUPPORTED_IMAGE`; больше 5 МБ → 413 `IMAGE_TOO_LARGE`; не декодируется → 400 `BAD_IMAGE`.
- До декодирования — размеры из заголовка: больше 12 000 px по стороне или 40 Мп → 400 `IMAGE_TOO_BIG_DIMENSIONS`
  (декомпрессионная бомба).
- Перекодирование: декодировать (ImageIO; WebP — TwelveMonkeys `imageio-webp`), повернуть по EXIF Orientation,
  уменьшить до 2048 px по длинной стороне, записать заново: без альфа-канала — JPEG q≈0.85, с альфой — PNG.
  Метаданные (EXIF, GPS, комментарии) и всё лишнее в файле (полиглот: HTML/скрипт после конца картинки) при этом
  пропадают. Результат > 2 МБ → ещё раз с меньшим качеством/размером; не влезло — 400 `IMAGE_TOO_LARGE`.
- Хранение: `chat_attachment` (`attachment_id uuid unique`, `message_id` FK ON DELETE CASCADE, `content_type`
  `image/jpeg|image/png`, `width`, `height`, `size_bytes`, `data bytea`). Имя файла нигде не хранится.
- Ответ 201 — сообщение, как у `reply`.

**Отдача в админке**: `GET api/chats/{id}/attachments/{attachmentId}` (логин) — байты, `Content-Type` из записи,
`X-Content-Type-Options: nosniff`, `Content-Disposition: inline; filename="<attachmentId>.jpg|png"`,
`Cache-Control: private, max-age=86400`. Фронт админки берёт картинку `HttpClient` как blob (токен в заголовке).

### `chatFromAppQueue` — `ChatReplyDto` (+ SR-220)
| поле | тип | обяз. | смысл |
|---|---|---|---|
| type | string | нет | `TEXT` (нет поля = TEXT) / `IMAGE` |
| image | object | для IMAGE | `{ attachmentId: uuid, contentType: "image/jpeg"\|"image/png", width, height, data: base64 }` |
Для IMAGE `text` может быть `""`. Webstore не доверяет и проверяет: `contentType` из двух допустимых, сигнатура
`data` совпадает с `contentType`, размер ≤ 2 МБ, `width`/`height` 1…2048; иначе — `InvalidChatReplyException` → DLQ.
Повтор `messageId` — игнор (картинка второй раз не пишется).
**Порядок выката**: webstore раньше админки (старый webstore отправил бы IMAGE с пустым текстом в DLQ).

### `chatToAppQueue` — `ChatEventDto` (+ SR-220)
| поле | тип | обяз. | смысл |
|---|---|---|---|
| type | string | нет | `TEXT` (нет поля = TEXT) / `PRODUCT` |
| product | object | для PRODUCT | снимок из каталога webstore: `{ productId, name, price, oldPrice\|null, imageUrl\|null, siteUrl }` |
`productId` — `appId` товара webstore = id товара в админке (ссылка в админке — `/catalogs/product-list/product/{productId}`).
`siteUrl` — `${host.frontend-url}/{язык диалога}/product/{productId}/{slug}`; `imageUrl` — полный URL главного фото
(`URLBuilder.getFullImageUrl`). Админка хранит снимок как пришёл (цена на момент вопроса).

### REST webstore (+ SR-220)
**Файлы и multipart не принимаются нигде.** Все `POST /api/v1/chat/**` принимают только `Content-Type:
application/json` (с `charset` — можно), иное (multipart/form-data, text/plain, octet-stream) → 415
`UNSUPPORTED_MEDIA_TYPE` до чтения тела, ничего не сохраняется. Лимит тела 8 КБ — как был.

`POST /api/v1/chat/messages` — карточка товара:
```json
{ "clientMessageId": "uuid", "type": "PRODUCT", "productId": 123, "text": "Есть 75B?", "language": "ro", ... }
```
- Сервер берёт товар из своего каталога по `productId` (`appId` товара; `appId` варианта — к его товару) и только
  если он виден на сайте (`uploadToTheSite = true`); нет или скрыт → 404 `PRODUCT_NOT_FOUND`, ничего не сохраняется.
- Название (по языку диалога: `nameRo`/`nameRu`, иначе `name`), цена, старая цена, фото, ссылка — только из каталога;
  присланные клиентом `name`/`price`/`imageUrl`/`url`/`product` игнорируются. Снимок сохраняется в сообщении.
- `text` для PRODUCT необязателен (0…1000); антиспам, лимиты, `clientMessageId` — как у TEXT.
- `type: "IMAGE"` от покупателя → 400 `BAD_TYPE`; неизвестный тип → 400 `BAD_TYPE`.

`GET /api/v1/chat/messages` — сообщение:
```json
{ "messageId", "seq", "author", "type": "TEXT|IMAGE|PRODUCT", "text", "createdAt",
  "image": { "attachmentId": "uuid", "width": 1600, "height": 1200 } | null,
  "product": { "productId", "name", "price", "oldPrice", "imageUrl", "siteUrl" } | null }
```
Ответ `POST messages` (201) — сообщение в том же виде.

`GET /api/v1/chat/attachments/{attachmentId}` — картинка покупателю:
- Только с `X-Chat-Key`, и только если вложение принадлежит диалогу этого ключа; чужое/нет → 404 `NOT_FOUND`
  (не 403 — не подтверждаем, что такое вложение существует). Лимит — `pollLimiter`.
- `Content-Type` из записи (`image/jpeg`|`image/png`), `X-Content-Type-Options: nosniff`,
  `Content-Disposition: inline; filename="<attachmentId>.jpg|png"` (только ASCII), `Cache-Control: no-store`
  (на `api.*/api/*` может стоять Cache Rule Cloudflare; картинка личная).
- Сайт берёт её `HttpClient` как blob с `X-Chat-Key` и показывает через `URL.createObjectURL` (ключ в URL не кладём);
  blob-URL живут, пока жив виджет (кэш по attachmentId), и отзываются при его уничтожении.

### Ссылки в тексте
- Ссылка — только `http://` или `https://` до пробела; хвостовые `.,;:!?)]}»"'` не входят в ссылку. `javascript:`,
  `data:`, `vbscript:`, `file:`, `mailto:` и прочее — текст. Адрес проверяется `new URL()`; не разобрался — текст.
- Разметка: текст режется на куски `{ text } | { link: href, label, host }` функцией (без регулярок поверх HTML), шаблон
  выводит `{{ }}` и `<a [href] target="_blank" rel="noopener noreferrer nofollow">`. Нет `innerHTML`/`bypassSecurityTrust*`.
  `<a href=javascript:…>`, `"><img src=x onerror=…>`, `<script>` в тексте остаются текстом.
- Админка: у ссылки в сообщении покупателя рядом серым — домен (`host`), чтобы сотрудник видел, куда ведёт.
- Антиспам «больше 3 ссылок → 400 SPAM» для покупателя остаётся.

### Сайт: «Спросить в чате»
- Кнопка на странице товара — отдельный компонент рядом с «В корзину» (в одном ряду с кнопками SR-223, но в своём
  компоненте). Нажатие открывает окно чата и кладёт карточку товара над полем ввода («Вы спрашиваете о…», крестик
  убирает); «Отправить» отправляет PRODUCT с необязательным текстом. Окно ещё не загрузилось (`@defer`) — запрос
  ждёт в сервисе и выполняется при появлении виджета.
- Чат выключен (виджет получил 404) — кнопки нет.
- Карточка в окне (у обеих сторон): фото, название, цена (старая зачёркнута), ссылка на товар. В админке — ещё ссылка
  «Открыть в админке».
- Картинка сотрудника: превью в сообщении (не шире окна), по нажатию — крупно поверх окна, закрытие по Esc/крестику/фону.
