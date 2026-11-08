import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PLATFORM_ID, signal} from '@angular/core';
import {provideTransloco} from '@ngneat/transloco';
import {AskInChat, productDraftOf} from './ask-in-chat';
import {ChatAsk} from '../chat-ask';
import {Language} from '../../../@core/services/language';
import {Product} from '../../../entities/product';

const PRODUCT = {
  id: '12', name: 'bra', nameRo: 'sutien', nameRu: 'бюстгальтер', price: 900, oldPrice: 1200,
  imageURL: 'https://api.secretroom.md/img/1.jpg', size: null, discountPercent: 25, isNew: false, isBestSeller: false,
} as Product;

describe('AskInChat (SR-220: «Спросить в чате»)', () => {
  let fixture: ComponentFixture<AskInChat>;
  let ask: ChatAsk;
  const button = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.ask-in-chat');

  function setup(product: Product | null, platform: 'browser' | 'server' = 'browser') {
    TestBed.configureTestingModule({
      imports: [AskInChat],
      providers: [
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: PLATFORM_ID, useValue: platform},
      ],
    });
    ask = TestBed.inject(ChatAsk);
    fixture = TestBed.createComponent(AskInChat);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
  }

  it('click hands the product to the chat (localized name, prices, photo)', () => {
    setup(PRODUCT);
    expect(button()!.textContent).toContain('chat.askInChat');
    button()!.click();
    expect(ask.request()).toEqual({
      productId: 12, name: 'Бюстгальтер', price: 900, oldPrice: 1200, imageUrl: 'https://api.secretroom.md/img/1.jpg',
    });
  });

  it('no button without a product or a valid id', () => {
    setup(null);
    expect(button()).toBeNull();
    fixture.componentRef.setInput('product', {...PRODUCT, id: 'abc'});
    fixture.detectChanges();
    expect(button()).toBeNull();
  });

  it('chat switched off: the button disappears', () => {
    setup(PRODUCT);
    expect(button()).not.toBeNull();
    ask.disable();
    fixture.detectChanges();
    expect(button()).toBeNull();
  });

  it('platform server: renders the button without browser storage', () => {
    const getItem = spyOn(Storage.prototype, 'getItem').and.callThrough();
    setup(PRODUCT, 'server');
    expect(button()).not.toBeNull();
    expect(getItem).not.toHaveBeenCalled();
  });

  it('productDraftOf: appId wins, ro name, fallbacks', () => {
    expect(productDraftOf({...PRODUCT, appId: '77'}, 'ro')?.productId).toBe(77);
    expect(productDraftOf(PRODUCT, 'ro')?.name).toBe('Sutien');
    expect(productDraftOf({...PRODUCT, nameRo: '', nameRu: ''}, 'ro')?.name).toBe('Bra');
    expect(productDraftOf({...PRODUCT, imageURL: null, productImagesWebStore: [{imageUrl: 'https://x/2.jpg'}]} as Product, 'ru')
      ?.imageUrl).toBe('https://x/2.jpg');
    expect(productDraftOf({...PRODUCT, oldPrice: undefined as unknown as number}, 'ru')?.oldPrice).toBeNull();
    expect(productDraftOf({...PRODUCT, id: '0'}, 'ru')).toBeNull();
  });
});
