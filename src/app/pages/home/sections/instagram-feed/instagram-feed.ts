import {Component, OnInit, signal, inject, HostListener, PLATFORM_ID, ViewEncapsulation} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {InstagramService, InstagramMedia} from '../../../../@core/api/instagram';
import {Language} from '../../../../@core/services/language';

@Component({
  selector: 'instagram-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instagram-feed.html',
  styleUrl: './instagram-feed.scss',
  encapsulation: ViewEncapsulation.None
})
export class InstagramFeed implements OnInit {
  private instagramService = inject(InstagramService);
  private readonly VIEWED_KEY = 'ig_viewed_posts';
  viewedIds = signal<Set<string>>(new Set());
  posts = signal<InstagramMedia[]>([]);
  isLoading = signal(true);
  isViewerOpen = signal(false);
  currentIndex = signal(0);
  private platformId = inject(PLATFORM_ID);
  isMuted = signal<boolean>(false);
  private autoPlayTimer?: any;
  private readonly IMAGE_DURATION = 5000;
  private langService = inject(Language);
  activeLang = this.langService.currentLanguage;


  ngOnInit(): void {
    this.instagramService.getFeed(10).subscribe({
      next: (data) => {
        this.posts.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Instagram feed error:', err);
        this.isLoading.set(false);
      }
    });
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const stored = JSON.parse(
      localStorage.getItem(this.VIEWED_KEY) || '[]'
    );

    this.viewedIds.set(new Set(stored));
  }

  get currentPost(): InstagramMedia | null {
    return this.posts()[this.currentIndex()] || null;
  }
  openViewer(index: number): void {
    this.currentIndex.set(index);
    this.isViewerOpen.set(true);
    document.body.style.overflowY = 'hidden';
    this.markViewed(this.currentPost?.id || '');
    this.startAutoPlay();
  }

  closeViewer(): void {
    this.clearTimer();
    document.body.style.overflow = '';
    this.isViewerOpen.set(false);
  }

  next(): void {
    if (this.currentIndex() < this.posts().length - 1) {
      this.currentIndex.update(i => i + 1);
      this.markViewed(this.currentPost?.id || '');
      this.startAutoPlay(); // Перезапускаем таймер для следующего слайда
    } else {
      this.closeViewer(); // Если истории закончились — закрываем
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


  markViewed(postId: string) {
    this.viewedIds.update(set => {
      if (set.has(postId)) return set;

      const next = new Set(set);
      next.add(postId);

      localStorage.setItem(
        this.VIEWED_KEY,
        JSON.stringify([...next])
      );

      return next;
    });
  }

  isViewed(id: string): boolean {
    return this.viewedIds().has(id);
  }


  toggleMute(event: Event) {
    event.stopPropagation();
    this.isMuted.update(v => !v);
  }

  private startAutoPlay(): void {
    this.clearTimer();

    const current = this.currentPost;
    if (!current) return;

    if (!this.isVideo(current)) {
      this.autoPlayTimer = setTimeout(() => {
        this.next();
      }, this.IMAGE_DURATION);
    }
  }

  private clearTimer(): void {
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
    }
  }
}
