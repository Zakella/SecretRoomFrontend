import {inject, Pipe, PipeTransform} from '@angular/core';
import {Language} from '../../@core/services/language';

@Pipe({
  name: 'localizedName',
  pure: false
})
export class LocalizedNamePipe implements PipeTransform {
  private langService = inject(Language);

  transform(item: unknown, field: string = 'name'): string {
    if (!item || typeof item !== 'object') return '';
    const lang = this.langService.currentLanguage();
    const roKey = field + 'Ro';
    const ruKey = field + 'Ru';
    let value: string;
    const fields = item as Record<string, unknown>;
    const str = (key: string): string => (typeof fields[key] === 'string' ? fields[key] as string : '');
    if (lang === 'ro' && str(roKey)) value = str(roKey);
    else if (lang === 'ru' && str(ruKey)) value = str(ruKey);
    else value = str(field);
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}