import {Component, inject, OnInit, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {ReturnPolicy} from '../../shared/components/modals/return-policy/return-policy';
import {TranslocoDirective} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {BrandService} from '../../@core/api/brand';
import {Brand} from '../../entities/category';

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    ReturnPolicy,
    TranslocoDirective
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer implements OnInit {
  isReturnPolicyVisible = false;
  private langService = inject(Language);
  private brandService = inject(BrandService);
  private router = inject(Router);

  public activeLang = this.langService.currentLanguage;
  public brands = signal<Brand[]>([]);

  ngOnInit() {
    this.brandService.gerAllBrands().subscribe(brands => {
      // Take only first 5-6 brands to not clutter the footer
      this.brands.set(brands.slice(0, 6));
    });
  }

  showPolicy() {
    this.isReturnPolicyVisible = true;
  }

  goToBrand(brand: Brand) {
    const slug = this.brandService.toSlug(brand.brand);
    this.router.navigate([this.activeLang(), 'catalog', 'brand', slug]);
  }
}
