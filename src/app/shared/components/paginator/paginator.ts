import { Component } from '@angular/core';

@Component({
  selector: 'app-paginator',
  imports: [],
  templateUrl: './paginator.html',
  styleUrl: './paginator.scss'
})
export class Paginator {
  currentPage = 1;
  pageSize = 10;
  totalItems = 95;

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadData();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadData();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadData();
    }
  }

  loadData() {
    const offset = (this.currentPage - 1) * this.pageSize;
    // здесь должен быть вызов API с offset и pageSize
    // например: this.service.getPage(offset, pageSize).subscribe(...)
  }

}
