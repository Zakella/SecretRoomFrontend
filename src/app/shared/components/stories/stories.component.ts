import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {StoryModel} from "./story.model";
import {StoriesService} from "./stories.service";
import {STORIES} from "./stories";
import {NgOptimizedImage} from '@angular/common';
import {StoryViewComponent} from './story-view/story-view.component';


@Component({
  selector: 'app-stories',
  templateUrl: './stories.component.html',
  imports: [
    NgOptimizedImage,
    StoryViewComponent,
  ],
  styleUrls: ['./stories.component.scss'],
  providers: [StoriesService]
})
export class StoriesComponent implements OnInit, OnDestroy {

  // @ts-ignore
  stories: StoryModel = STORIES;
  storyIsOpen = false;
  unSub: Subject<void> = new Subject<void>();

  constructor(private storiesService: StoriesService) {
  }

  ngOnInit(): void {
    this.getStories();
  }

  ngOnDestroy(): void {
    this.unSub.next();
    this.unSub.complete();
  }

  getStories(): void {
    this.storiesService.changeStories(this.stories.data);
    this.initStoriesLogic();
  }

  initStoriesLogic(): void {
    this.storiesService.changeUsersCount(this.stories.data.length);
    this.storiesService.activeUserIndex$.pipe(takeUntil(this.unSub)).subscribe(x => {
      if (x === this.stories.data.length && this.storyIsOpen) {
        this.storyIsOpen = false;
      }
    });
  }

  openStory(index: number): void {
    this.storiesService.changeActiveUserIndex(index);
    this.storyIsOpen = true;
    document.body.style.overflowY = 'hidden';
  }

  closeStory(): void {
    this.storyIsOpen = false;
    this.getStories();
    document.body.style.overflowY = 'scroll';
  }
}
