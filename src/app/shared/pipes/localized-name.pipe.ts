import {inject, Pipe, PipeTransform} from '@angular/core';
import {Language} from '../../@core/services/language';

@Pipe({
  name: 'localizedName',
  pure: false
})
export class LocalizedNamePipe implements PipeTransform {
  private langService = inject(Language);

  transform(item: any, field: string = 'name'): string {
    if (!item) return '';
    const lang = this.langService.currentLanguage();
    const roKey = field + 'Ro';
    const ruKey = field + 'Ru';
    let value = '';
    if (lang === 'ro' && item[roKey]) value = item[roKey];
    else if (lang === 'ru' && item[ruKey]) value = item[ruKey];
    else value = item[field] || '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}