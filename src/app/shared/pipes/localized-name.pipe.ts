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
    if (lang === 'ro' && item[roKey]) return item[roKey];
    if (lang === 'ru' && item[ruKey]) return item[ruKey];
    return item[field] || '';
  }
}