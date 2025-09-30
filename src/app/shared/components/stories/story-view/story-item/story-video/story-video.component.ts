import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {interval, Observable, Subject, timer} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {StoriesService} from "../../../stories.service";
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'story-video',
  templateUrl: './story-video.component.html',
  imports: [AsyncPipe],
  styleUrls: ['./story-video.component.scss', '../story-item.component.scss', '../../story-view.component.scss']
})
export class StoryVideoComponent implements OnInit, OnDestroy {

  @Input() contentUrl: string = '';
  @Input() isVideo: boolean = false;
  @Input() storiesCount: number = 0;
  @Input() storyId: number = 0;
  @ViewChild('storyVideo') storyVideo!: ElementRef<HTMLVideoElement>;

  unSub: Subject<void> = new Subject<void>();
  videoVolume$: Observable<number> = new Observable<number>();

  trackWidthValue = 0;
  activeStoryIndex: number = 0;

  constructor(private storiesService: StoriesService) {
  }

  ngOnInit(): void {
    this.initActiveStoryIndexSub();
    this.initStory();
  }

  ngOnDestroy(): void {
    this.unSubAll();
    this.storiesService.changeTrackWidth(0);
  }

  initStory(): void {
    this.videoVolume$ = this.storiesService.videoVolume$;
    this.trackWidthValue = 0;
    this.storiesService.changeTrackWidth(0);
    this.storiesService.changeStoriesCount(this.storiesCount);
    if (this.isVideo) {
      this.initVideo();
    } else {
      this.initImage();
    }
  }


  initImage(): void {
    const width = 100 / 10;
    this.storiesService.storyTrackWidth$.pipe(takeUntil(this.unSub)).subscribe(() => {
      this.trackWidthValue += width;
    });
    this.setImageTrackInterval();
  }

  setImageTrackInterval(): void {
    timer(0, 1000).pipe(takeUntil(this.unSub)).subscribe(x => {
      this.storiesService.changeTrackWidth(this.trackWidthValue);
      if (x === 10) {
        this.nextStory();
      }
    });
  }

  initVideo(): void {
    const sub = interval(10).subscribe(() => {
      if (this.storyVideo.nativeElement.duration) {
        this.trackVideoWidthIncrease();
        sub.unsubscribe();
      }
    });
  }

  trackVideoWidthIncrease(): void {
    const width = 100 / this.storyVideo.nativeElement.duration;
    this.trackWidthValue = width;
    this.storiesService.changeTrackWidth(this.trackWidthValue);
    this.storiesService.storyTrackWidth$.pipe(takeUntil(this.unSub)).subscribe(() => {
      this.trackWidthValue += width;
      if (this.storyVideo.nativeElement.currentTime === this.storyVideo.nativeElement.duration) {
        this.nextStory();
      }
    });
    this.setTrackVideoInterval();
  }

  setTrackVideoInterval(): void {
    interval(1000).pipe(takeUntil(this.unSub)).subscribe(() => {
      this.storiesService.changeTrackWidth(this.trackWidthValue);
    });
  }

  initActiveStoryIndexSub(): void {
    this.storiesService.activeStoryIndex$.pipe(takeUntil(this.unSub)).subscribe(x => {
      this.activeStoryIndex = x;
    });
  }

  nextStory(): void {
    this.storiesService.nextStory();
  }

  unSubAll(): void {
    this.unSub.next();
    this.unSub.complete();
  }
}
