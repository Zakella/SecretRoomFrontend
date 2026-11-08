# SR-229 — акции на сайте: выгрузка правил, расчёт в WebStoreBackend, заказ обратно в админку

Эпик SR-226. Правила и движок — [promo-rules.md](promo-rules.md) (SR-227), здесь — только то, как они доходят до
сайта и возвращаются заказом. Три репозитория: Enterprise (админка), WebStoreBackend (бэкенд сайта),
Frontend (сайт). Порядок выката: **webstore → админка → сайт**; любая пара «старое + новое» не падает.

**Не навреди:** нет действующих акций — каталог, корзина, заказ, MAIB и W-заказ админки ровно как раньше
(те же поля, те же значения).

```
админка: Promotion save/delete ─┐
         выгрузка товаров/категорий ─┼─▶ WebStorePublishQueue(PROMOTIONS) ─▶ promotionQueue (полный снимок)
                                 ┘                                              │
webstore: promotion_rule (+ товары) ◀───────────────────────────────────────────┘
          каталог/карточка (PERCENT → цена), POST /api/v1/cart/calculate, POST /api/v1/order — один калькулятор
          ─▶ orderQueue: OrderItemDto + promotionId/promotionName/promotionDiscount/lineTotal ─▶ W-заказ админки
```

## 1. Сообщение `promotionQueue` (админка → webstore)

Очередь: ключ `promotion` рядом с остальными в `application*.yaml` обоих сервисов —
`promotionQueue` / `promotionQueueDev` / `promotionQueueStage`. Default exchange, routing key = имя очереди,
durable, без x-аргументов. **Объявляют обе стороны** (webstore выкатывается первым и без очереди не стартует).

Тело — полный снимок (не дельта; пустой `rules` = «акций на сайте нет»):

```json
{
  "generatedAt": "2026-11-07T10:00:00Z",
  "rules": [
    {
      "id": 7, "name": "Black Friday", "type": "NTH_PERCENT", "channel": "ONLINE",
      "start": "2026-11-27T22:00:00Z", "end": "2026-11-30T21:59:59Z", "priority": 0,
      "percent": 50, "nth": 2, "buy": null, "free": null,
      "productIds": [101, 102, 103]
    }
  ]
}
```

- В снимок идут правила: `applyMode = AUTO`, `active`, не `deleted`, `channel` ∈ {`ONLINE`, `ALL`},
  `end` = null или `end ≥ now`. **Будущие тоже** (с `start` в будущем): границы дат webstore считает сам по своим
  часам, без новой выгрузки (DoD 1). Типы — `PERCENT`, `NTH_PERCENT`, `BUY_X_GET_Y`.
- `productIds` — id товаров админки (`product.id`, это `appId` на сайте — и карточки, и варианта-размера), которые
  входят в группы правила по правилам promo-rules.md «Как строка попадает в группу» (категория товара и потомки,
  категория сайта и потомки, бренд, карточка — все размеры цвета). Раскрывает админка
  (`PromotionCalculationService.coveredProductIds`): на сайте нет дерева категорий товара и связей
  категория сайта ↔ категория товара. Удалённые товары не входят.
- Даты — ISO-8601 instant (`Z`). `name` — имя из админки, одноязычное: на витрине не показывается (см. §4), едет в
  W-заказ.
- Когда шлётся: после коммита сохранения/удаления акции, после каждой выгрузки товаров и категорий (состав групп
  мог измениться), кнопкой «Загрузить акции на сайт» (`POST /api/web-store/load-promotions`, CEO/ADMIN).
- webstore: DTO с `@JsonIgnoreProperties(ignoreUnknown = true)`; снимок с `generatedAt` старее сохранённого —
  игнорируется; сохраняет в своей БД (переживает рестарт и недоступность админки — «последние известные»).

## 2. Расчёт на webstore

Движок — копия `documents/marketing/promo/engine` из админки один в один (те же формулы, округление, жадный выбор,
golden-examples.json в тестах webstore). Адаптер:

- Строка корзины → `PromoLine`: `productId` = `variantAppId` ?? `appId` карточки; `unitPrice` = базовая цена
  единицы = `oldPrice`, если `oldPrice > price`, иначе `price` (варианта, если он есть, иначе карточки);
  `productDiscount` = (`unitPrice` − `price`) × `quantity` («Установка скидок»); `cardDiscount`, `manualDiscount` —
  null (карта — SR-224).
- Группа правила раскрыта админкой, поэтому адаптер не повторяет деревья: правило → `PromoRule` с одной целью
  `PRODUCT_CATEGORY` id = id правила; строке в `categoryIds` кладутся id правил, в чьих `productIds` есть её
  `productId` **или `appId` карточки**. Канал продажи — `ONLINE`, момент — серверное «сейчас».
- Итог строки: `PROMO` → к оплате `unitPrice × qty − скидка акции` (целые леи, ниже); `PRODUCT` / `NONE` →
  `price × qty`, как раньше. Значит без акций суммы совпадают с прежними до копейки.
- Сбой калькулятора (исключение) → лог ERROR и расчёт без акций; заказ не блокируется.

**Целые леи.** Как касса с SR-228 (promo-rules.md «Строка чека (SR-228)»), сайт даёт скидку акции целыми леями
вниз от скидки **всей строки** — в адаптере, движок и golden-examples не меняются. Для всех типов (`PERCENT`,
`NTH_PERCENT`, `BUY_X_GET_Y`) скидка строки корзины/заказа = `floor(appliedDiscount)` движка. Цена в каталоге — цена
одной штуки по тому же правилу (qty 1): `unitPrice − floor(unitPrice × p / 100)`. Поэтому строка корзины может быть
дешевле «цена карточки × количество» до `qty − 1` лея — в пользу покупателя, зато сумма совпадает с кассой.
Победитель строки — как решил движок; если после округления скидка стала 0 или меньше скидки товара — строка как
без акции. Поэтому `lineTotal`, `promotionSavings`, `promotionDiscount`, итоги корзины и заказа, позиции MAIB и
`OrderItemDto` — целые (`.00`). Пример: 349, акция 15% → карточка 297 (скидка 52), корзина qty 3 → скидка
`floor(157.05)` = 157, строка 890 (не 891); «50% на второй» на 2 × 349 → скидка 174.

### Каталог и карточка (`ProductDTO`, все эндпоинты товаров)
- Действующее правило `PERCENT` на товар: за единицу `floor(unitPrice × p / 100)` (целые леи, qty 1); если это **больше**
  скидки товара (`unitPrice − price`; равенство — тоже акция, как PROMO > PRODUCT) — в ответе `price` = `unitPrice −
  promo`, `oldPrice` = `unitPrice`, `discountPercent` = p. То же для каждого варианта. Старый фронт видит
  зачёркнутую цену без доработок.
- Новое поле `promotions` (карточка; пусто/нет — акций нет) — действующие правила товара (карточка или любой её
  вариант), порядок: `priority` desc, `id` asc:
  ```json
  "promotions": [{"id": 7, "type": "NTH_PERCENT", "percent": 50, "nth": 2, "buy": null, "free": null,
                  "onlineOnly": true}]
  ```
  `onlineOnly` = `channel == ONLINE` (DoD 7). В списке не применённое к цене правило тоже есть (для бейджа).
- Начало/конец акции: раз в минуту webstore сверяет набор действующих правил; изменился — прогрев кэша каталога
  (`CacheWarmupService`), как после выгрузки товаров. После приёма снимка — тоже.
- Не вошло: страница «Скидки» (`/api/products/sales`) и сортировка по цене — по ценам из админки, без акций.

### `POST /api/v1/cart/calculate` (новый, без авторизации)
Запрос: `{"items": [{"productId": 12, "variantAppId": 345, "quantity": 2}]}` — `productId` = `appId` карточки
(как `orderItems[].product.id` в заказе). До 100 строк, `quantity` 1..999, Σ `quantity` ≤ 200 (иначе 400
`VALIDATION`); неизвестный товар — строка с
`available: false` и нулями, расчёт остальных не падает.

Ответ (порядок строк = порядок запроса):
```json
{
  "lines": [{"productId": 12, "variantAppId": 345, "quantity": 2, "unitPrice": 100.00, "price": 100.00,
             "lineTotal": 150.00, "promotionSavings": 50.00,
             "promotion": {"id": 7, "type": "NTH_PERCENT", "percent": 50, "nth": 2, "buy": null, "free": null,
                           "onlineOnly": true},
             "available": true}],
  "itemsTotal": 200.00, "promotionSavings": 50.00, "total": 150.00
}
```
- `price` — цена единицы после скидки товара (как в каталоге без акций); `itemsTotal` = Σ `price × qty` (то, что
  было итогом раньше); `lineTotal` — к оплате за строку; `promotionSavings` строки = `price × qty − lineTotal`
  (сколько акция сэкономила **сверх** прежней цены — это и есть «строка скидки» на витрине; 0 и
  `promotion: null`, если акция не победила); `promotionSavings` корзины = Σ по строкам; `total` = Σ `lineTotal` =
  `itemsTotal − promotionSavings`. Доставка не входит (её считает checkout как раньше).

### Заказ `POST /api/v1/order`
- `setupOrderItems` / `recalculateTotals` считают тем же калькулятором по ценам из БД; суммы клиента, как и
  раньше, только логируются при расхождении. `totalAmount` = Σ `lineTotal`. **Порог бесплатной доставки — от суммы
  после скидки акции** (Jira: «зафиксировать и показать владельцу»); фронт считает полосу «до бесплатной доставки»
  от `total`.
- `OrderItem` (webstore) — новые колонки: `promotion_id`, `promotion_name`, `promotion_discount`, `line_total`,
  `promotion_savings`. Строка, где победила акция: `price` = `unitPrice` (база), `discount` = 0, `discountAmount` = 0,
  `amount` = `unitPrice`; `promotionDiscount` = `unitPrice × qty − lineTotal` (вся скидка акции от базы, лей на
  строку), `lineTotal`; `promotionSavings` = цена единицы со скидкой товара × qty − `lineTotal` (как в корзине),
  фиксируется при создании заказа — `OrderReview` берёт её, а не каталог. Строка без акции — старые поля как раньше,
  `lineTotal` = `price × qty`, `promotionSavings` = 0, `promotion*` = null; строки до SR-229 — `line_total` и
  `promotion_savings` = null.
- MAIB: сумма — `totalAmountOrder` (как раньше). Позиции: строка без акции — как раньше; строка с акцией —
  (`lineTotal / qty`, `qty`), если делится до копейки, иначе (`lineTotal`, 1). Σ позиций + доставка = сумма.
- `GET /api/v1/order/{uuid}` (`OrderReview`): у строки `promotionSavings`, `promotion` (как в корзине),
  `lineTotal`; у заказа `promotionSavings` (Σ по строкам). Смысл `promotionSavings` — как в корзине. Для страницы «заказ оформлен».

## 3. Заказ в админку (`orderQueue`, `OrderItemDto`)
Новые поля строки (старая админка их игнорирует — конвертер не падает на неизвестных полях):
`promotionId` (Long), `promotionName` (String), `promotionDiscount` (лей на строку, от базы), `lineTotal`.
Админка: колонки `order_items.promotion_id` (FK на `promotion`, nullable; акции с таким id нет — null, заказ
принимается), `promotion_name`, `promotion_discount`, `line_total` (Liquibase); W-заказ показывает по строке акцию
и скидку; сумма W-заказа = сумма заказа сайта = сумма MAIB.

## 4. Витрина (Frontend)
- Подпись акции — из словарей ro/ru по типу, не имя из админки: `PERCENT` «−{{p}}%», `NTH_PERCENT`
  «{{n}}-й товар −{{p}}%», `BUY_X_GET_Y` «{{buy}}+{{free}} в подарок» (ro — свой текст).
- Каталог и карточка: цена и зачёркнутая старая — из `price`/`oldPrice` (уже с PERCENT); бейдж акции
  (`.badge-sale`) по первому из `promotions`; `onlineOnly` → пометка «только онлайн» / «doar online».
- Корзина и оформление: `POST /api/v1/cart/calculate` при каждом изменении корзины; строка скидки по акции,
  подпись акции у строки, «только онлайн»; итог = `total` (+ доставка в checkout). Эндпоинт недоступен (старый
  webstore, сеть) — расчёт как раньше, без строки акции.
- Страница заказа (`order-summary`) — строка скидки по акции из `OrderReview`.
- Валидации checkout (латиница, телефон) не меняются.
