import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {provideTransloco} from '@ngneat/transloco';
import {OpenChat} from './open-chat';
import {ChatAsk} from '../chat-ask';

describe('OpenChat (SR-238: «Написать в чат»)', () => {
  let fixture: ComponentFixture<OpenChat>;
  let ask: ChatAsk;
  const el = () => fixture.nativeElement as HTMLElement;
  const button = () => el().querySelector<HTMLButtonElement>('button.open-chat__btn');

  function setup(platform: 'browser' | 'server' = 'browser') {
    TestBed.configureTestingModule({
      imports: [OpenChat],
      providers: [
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: PLATFORM_ID, useValue: platform},
      ],
    });
    ask = TestBed.inject(ChatAsk);
    fixture = TestBed.createComponent(OpenChat);
    fixture.detectChanges();
  }

  it('button with the label and the note; click asks the chat to open, no navigation', () => {
    setup();
    expect(button()!.type).toBe('button');
    expect(button()!.textContent).toContain('chat.contacts.button');
    expect(el().querySelector('.open-chat__note')!.textContent).toContain('chat.contacts.note');
    expect(el().querySelector('a')).toBeNull();
    button()!.click();
    expect(ask.openRequested()).toBeTrue();
  });

  it('chat switched off: no button', () => {
    setup();
    ask.disable();
    fixture.detectChanges();
    expect(button()).toBeNull();
    expect(el().querySelector('.open-chat')).toBeNull();
  });

  it('platform server: renders the button without browser storage', () => {
    const getItem = spyOn(Storage.prototype, 'getItem').and.callThrough();
    setup('server');
    expect(button()).not.toBeNull();
    expect(getItem).not.toHaveBeenCalled();
  });
});
