import {PLATFORM_ID, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MetaService} from '../../@core/services/meta.service';
import {Language} from '../../@core/services/language';
import {Contacts} from './contacts';

// The template embeds a Google Maps iframe, so the class is tested without rendering.
describe('Contacts', () => {
  let contacts: Contacts;
  let metaService: jasmine.SpyObj<MetaService>;

  beforeEach(() => {
    metaService = jasmine.createSpyObj<MetaService>('MetaService', [
      'updateTitle', 'updateDescription', 'updateKeywords', 'updateImage', 'setJsonLd',
    ]);

    TestBed.configureTestingModule({
      providers: [
        {provide: MetaService, useValue: metaService},
        {provide: Language, useValue: {currentLanguage: signal('ro')}},
        // Server platform: the lightbox must not touch document.body in tests.
        {provide: PLATFORM_ID, useValue: 'server'},
      ],
    });

    contacts = TestBed.runInInjectionContext(() => new Contacts());
  });

  describe('stores', () => {
    it('should list three stores in order', () => {
      expect(contacts.stores.map(s => s.id)).toEqual([1, 2, 3]);
    });

    it('should keep Atrium unchanged', () => {
      const atrium = contacts.stores[0];
      expect(atrium.name).toBe('Secret Room');
      expect(atrium.location).toBe('Atrium, et. 1 , but. 1029, str. Albişoara 4, Chișinău, Moldova');
      expect(atrium.latitude).toBe(47.015438488623985);
      expect(atrium.longitude).toBe(28.856022676715895);
      expect(atrium.layout).toBeUndefined();
      expect(atrium.brands).toBeUndefined();
      expect(atrium.photos).toEqual([{
        desktop: '/stores/atrium/atrium-collage-desktop.jpg',
        desktopWebp: '/stores/atrium/atrium-collage-desktop.webp',
        mobile: '/stores/atrium/atrium-collage-mobile.jpg',
        mobileWebp: '/stores/atrium/atrium-collage-mobile.webp',
        landscape: true,
      }]);
    });

    it('should keep Eminescu 56 unchanged', () => {
      const eminescu = contacts.stores[1];
      expect(eminescu.name).toBe('Secret Room');
      expect(eminescu.location).toBe('str. Eminescu 56, Chișinău, Moldova');
      expect(eminescu.latitude).toBe(47.0211404);
      expect(eminescu.longitude).toBe(28.8360804);
      expect(eminescu.layout).toBeUndefined();
      expect(eminescu.brands).toBeUndefined();
      expect(eminescu.photos).toEqual([{desktop: '/stores/eminescu/1.jpeg'}]);
    });

    it('should describe Secret Angel as a collage card with four photos', () => {
      const angel = contacts.stores[2];
      expect(angel.name).toBe('Secret Angel');
      expect(angel.layout).toBe('collage');
      expect(angel.photos.length).toBe(4);
      // The entrance shot with the shop sign opens the collage and the lightbox.
      expect(angel.photos[0].desktop).toBe('/stores/secret-angel/3-entrance-desktop.jpg');
      for (const photo of angel.photos) {
        expect(photo.desktop).toMatch(/^\/stores\/secret-angel\/.+-desktop\.jpg$/);
        expect(photo.desktopWebp).toMatch(/^\/stores\/secret-angel\/.+-desktop\.webp$/);
        expect(photo.mobile).toMatch(/^\/stores\/secret-angel\/.+-mobile\.jpg$/);
        expect(photo.mobileWebp).toMatch(/^\/stores\/secret-angel\/.+-mobile\.webp$/);
      }
    });

    it('should list the five Secret Angel brands with translation keys', () => {
      const brands = contacts.stores[2].brands ?? [];
      expect(brands.map(b => b.name)).toEqual([
        'Bath & Body Works', 'KIKO Milano', 'Nayomi', 'Ann Summers', 'PINK',
      ]);
      for (const brand of brands) {
        expect(brand.descriptionKey).toMatch(/^storeBrands\.\w+$/);
      }
    });
  });

  describe('ngOnInit', () => {
    it('should emit one LocalBusiness JSON-LD per store', () => {
      contacts.ngOnInit();

      const calls = metaService.setJsonLd.calls.allArgs();
      expect(calls.map(([, id]) => id)).toEqual([
        'local-business-1', 'local-business-2', 'local-business-3',
      ]);
      for (const [data] of calls) {
        expect((data as Record<string, unknown>)['@type']).toBe('LocalBusiness');
      }
    });

    it('should give Secret Angel its own name and a clean street address', () => {
      contacts.ngOnInit();

      const [data] = metaService.setJsonLd.calls.allArgs()
        .find(([, id]) => id === 'local-business-3')!;
      const jsonLd = data as {name: string, address: {streetAddress: string}};
      expect(jsonLd.name).toBe('Secret Angel');
      expect(jsonLd.address.streetAddress.trim()).not.toBe('');
      expect(jsonLd.address.streetAddress).not.toContain(',');
    });
  });

  describe('lightbox', () => {
    beforeEach(() => {
      contacts.openLightbox(contacts.stores[2].photos, 0);
    });

    it('should open on the requested photo', () => {
      expect(contacts.isLightboxOpen()).toBeTrue();
      expect(contacts.activePhotos().length).toBe(4);
      expect(contacts.activeIndex()).toBe(0);
    });

    it('should cycle forward through all four photos', () => {
      const seen = [contacts.activeIndex()];
      for (let i = 0; i < 4; i++) {
        contacts.nextPhoto();
        seen.push(contacts.activeIndex());
      }
      expect(seen).toEqual([0, 1, 2, 3, 0]);
    });

    it('should cycle backward from the first photo to the last', () => {
      contacts.prevPhoto();
      expect(contacts.activeIndex()).toBe(3);
      contacts.prevPhoto();
      expect(contacts.activeIndex()).toBe(2);
    });

    it('should follow arrow keys and close on Escape', () => {
      contacts.onKeydown(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
      expect(contacts.activeIndex()).toBe(3);
      contacts.onKeydown(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
      expect(contacts.activeIndex()).toBe(0);
      contacts.onKeydown(new KeyboardEvent('keydown', {key: 'Escape'}));
      expect(contacts.isLightboxOpen()).toBeFalse();
    });
  });
});
