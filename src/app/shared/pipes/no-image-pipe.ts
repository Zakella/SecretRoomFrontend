import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'noImage',
  pure: true
})
export class NoImagePipe implements PipeTransform {
  transform(value: any, fallback: string = NoImagePipe.defaultSvg): string {
    // если value — уже DataURL или строка с непустым значением — возвращаем
    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    // если value — File/Blob, создаём object URL
    if (value instanceof File || value instanceof Blob) {
      return URL.createObjectURL(value);
    }

    // если value — объект с полем image / url — попробуем извлечь
    if (value && typeof value === 'object') {
      const possible = (value.url ?? value.image ?? value.src ?? value.path);
      if (typeof possible === 'string' && possible.trim()) {
        return possible;
      }
    }

    return fallback;
  }

  private static defaultSvg = `data:image/svg+xml;utf8,
    <svg xmlns='http://www.w3.org/2000/svg' width='200' height='120' viewBox='0 0 200 120'>
      <rect width='100%' height='100%' fill='%23f2f2f2'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%23999'>No Image</text>
    </svg>`;
}
