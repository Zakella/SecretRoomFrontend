import {Component, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {IStory} from "../../story.model";
import {StoriesService} from "../../stories.service";
import {AsyncPipe, NgForOf, NgIf, NgStyle, NgTemplateOutlet} from '@angular/common';
import {StoryVideoComponent} from './story-video/story-video.component';

@Component({
  selector: 'story-item',
  templateUrl: './story-item.component.html',
  styleUrls: ['./story-item.component.scss', '../story-view.component.scss'],
  imports: [
    NgStyle,
    NgTemplateOutlet,
    StoryVideoComponent,
    AsyncPipe,
    NgIf,
    NgForOf
  ]
})
export class StoryItemComponent implements OnInit, OnDestroy {

    @Input() stories: IStory[] = [];
    @Input() author: string = '';
    @Input() avatar: string = '';
    @Input() userIndex: number = 0;

    isMobile: boolean = false;

    trackWidth$: Observable<number> = new Observable<number>();
    activeStoryIndex$: Observable<number> = new Observable<number>();
    unSub: Subject<void> = new Subject<void>();
    isStoryActive: boolean = false;

    transformValue = '';
    transformMobileValue = '';
    zIndexValue = '1001';

    constructor(private storiesService: StoriesService) {
    }

    ngOnInit(): void {
/*
        this.checkMobileWidth();
*/
        this.trackWidth$ = this.storiesService.storyTrackWidth$;
        this.activeStoryIndex$ = this.storiesService.activeStoryIndex$;
        this.storiesService.activeUserIndex$.pipe(takeUntil(this.unSub)).subscribe(x => {
            this.checkStoryActive(x);
            this.transform(x);
        });
    }

    ngOnDestroy(): void {
        this.unSub.next();
        this.unSub.complete();
    }

/*
    @HostListener('window:resize', ['$event'])
    checkMobileWidth(): void {
        this.isMobile = window.innerWidth <= 500;
    }
*/

    transform(activeUserIndex: number): void {
        if (activeUserIndex === this.userIndex) {
            this.transformValue = 'translate(0%) scale(1)';
            this.transformMobileValue = 'translate(0%)';
            this.zIndexValue = '1001';
            return;
        }
        if (this.userIndex - activeUserIndex > 2) {
            this.transformValue = 'translate(400%) scale(0.6)';
            this.transformMobileValue = 'translate(400%)';
            return;
        }
        if (this.userIndex - activeUserIndex < -2) {
            this.transformValue = 'translate(-400%) scale(0.6)';
            this.transformMobileValue = 'translate(-400%)';
            return;
        }
        switch (this.userIndex - activeUserIndex) {
            case -1: {
                this.transformValue = 'translate(-50%) scale(0.8)';
                this.transformMobileValue = 'translate(-100%)';
                this.zIndexValue = '1000';
                break;
            }
            case -2: {
                this.transformValue = 'translate(-100%) scale(0.6)';
                this.transformMobileValue = 'translate(-200%)';
                this.zIndexValue = '999';
                break;
            }
            case 1: {
                this.transformValue = 'translate(50%) scale(0.8)';
                this.transformMobileValue = 'translate(100%)';
                this.zIndexValue = '1000';
                break;
            }
            case 2: {
                this.transformValue = 'translate(100%) scale(0.6)';
                this.transformMobileValue = 'translate(200%)';
                this.zIndexValue = '999';
                break;
            }
        }
    }

    checkStoryActive(activeUserIndex: number): void {
        this.isStoryActive = activeUserIndex === this.userIndex;
    }
}
