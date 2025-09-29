import {Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {IStoryData} from "../story.model";
import {StoriesService} from "../stories.service";
import {NgTemplateOutlet} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {StoryItemComponent} from './story-item/story-item.component';
import {storyViewOpenAnimation} from './animations/story-view-open-animation';

@Component({
  selector: 'story-view',
  templateUrl: './story-view.component.html',
  styleUrls: ['./story-view.component.scss'],
  imports: [
    NgTemplateOutlet,
    FormsModule,
    StoryItemComponent,
  ],
      animations: [storyViewOpenAnimation]
})
export class StoryViewComponent implements OnInit, OnDestroy {

    @Input() storyIsOpen = false;
    @Input() stories: IStoryData[] = [];
    @Output() closeStoryViewEmitter: EventEmitter<void> = new EventEmitter<void>();
    activeUserIndex: number = 0;
    activeStoryIndex: number = 0;
    volume: number = 0.5;
    isMobile = false;

    unSub: Subject<void> = new Subject<void>();

    constructor(private storiesServices: StoriesService) {
    }

    ngOnInit(): void {
        this.initIndexesSubs();
/*
        this.checkMobileWidth();
*/
    }

    ngOnDestroy(): void {
        this.unSub.next();
        this.unSub.complete();
        document.body.style.overflowY = 'scroll';
    }

    initIndexesSubs(): void {
        this.storiesServices.activeUserIndex$.pipe(takeUntil(this.unSub)).subscribe(x => {
            this.activeUserIndex = x;
        });
        this.storiesServices.activeStoryIndex$.pipe(takeUntil(this.unSub)).subscribe(x => {
            this.activeStoryIndex = x;
        });
    }

/*    @HostListener('window:resize', ['$event'])
    checkMobileWidth(): void {
        this.isMobile = window.innerWidth <= 500;
    }*/

    changeVolume(value: number): void {
        this.storiesServices.changeVideoVolume(value);
    }

    toggleSound(): void {
        if (this.volume === 0) {
            this.volume = 1;
            this.storiesServices.changeVideoVolume(1);
            return;
        }
        this.volume = 0;
        this.storiesServices.changeVideoVolume(0);
    }

    closeStoryView(): void {
        this.closeStoryViewEmitter.emit();
        this.storiesServices.closeStory();
    }

    nextStory(): void {
        this.storiesServices.nextStory();
    }

    prevStory(): void {
        this.storiesServices.prevStory();
    }

    mobileStoryNavigation(event: MouseEvent, width: number): void {
        if (event.offsetX > width / 2) {
            this.nextStory();
            return;
        }
        if (this.activeUserIndex > 0 || this.activeStoryIndex > 0) {
            this.prevStory();
            return;
        }
        this.closeStoryView();
    }

    swipeRight(): void {
        const prevUserStoriesCount = this.stories[this.activeUserIndex - 1]?.stories.length;
        if (prevUserStoriesCount) {
            this.storiesServices.changeActiveUserIndex(this.activeUserIndex - 1);
            this.storiesServices.changeActiveStoryIndex(prevUserStoriesCount - 1);
            return;
        }
        this.closeStoryView();
    }

    swipeLeft(): void {
        this.storiesServices.changeActiveUserIndex(this.activeUserIndex + 1);
        this.storiesServices.changeActiveStoryIndex(0);
    }
}
