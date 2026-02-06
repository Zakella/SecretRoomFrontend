import {Component, OnInit, signal, inject, HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';
import {InstagramService, InstagramMedia} from '../../../../@core/api/instagram';

@Component({
  selector: 'instagram-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instagram-feed.html',
  styleUrl: './instagram-feed.scss'
})
export class InstagramFeed implements OnInit {
  private instagramService = inject(InstagramService);

  posts = signal<InstagramMedia[]>([]);
  isLoading = signal(true);

  // Viewer
  isViewerOpen = signal(false);
  currentIndex = signal(0);

  username = 'secretroom.md';
  profileUrl = 'https://instagram.com/secretroom.md';

  get currentPost(): InstagramMedia | null {
    return this.posts()[this.currentIndex()] || null;
  }

  ngOnInit(): void {
    this.instagramService.getFeed(6).subscribe({
      next: (data) => {
        this.posts.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Instagram feed error:', err);
        this.isLoading.set(false);
      }
    });
  }

  openViewer(index: number): void {
    this.currentIndex.set(index);
    this.isViewerOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeViewer(): void {
    this.isViewerOpen.set(false);
    document.body.style.overflow = '';
  }

  next(): void {
    if (this.currentIndex() < this.posts().length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isViewerOpen()) return;

    if (event.key === 'Escape') this.closeViewer();
    if (event.key === 'ArrowRight') this.next();
    if (event.key === 'ArrowLeft') this.prev();
  }

  isVideo(post: InstagramMedia): boolean {
    return post.mediaType === 'VIDEO';
  }

  getThumbnail(post: InstagramMedia): string {
    return post.thumbnailUrl || post.mediaUrl;
  }

  formatNumber(num: number | null): string {
    if (!num) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}