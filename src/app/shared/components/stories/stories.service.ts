import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {IStoryData} from "./story.model";



@Injectable()
export class StoriesService {
    private storyTrackWidth: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    public storyTrackWidth$: Observable<number> = this.storyTrackWidth.asObservable();

    private activeStoryIndex: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    public activeStoryIndex$: Observable<number> = this.activeStoryIndex.asObservable();

    private activeUserIndex: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    public activeUserIndex$: Observable<number> = this.activeUserIndex.asObservable();

    private videoVolume: BehaviorSubject<number> = new BehaviorSubject<number>(0.5);
    public videoVolume$: Observable<number> = this.videoVolume.asObservable();

    private storiesCount: BehaviorSubject<number> = new BehaviorSubject<number>(0);

    private usersCount: BehaviorSubject<number> = new BehaviorSubject<number>(0);

    private stories: BehaviorSubject<IStoryData[]> = new BehaviorSubject<IStoryData[]>([]);

    constructor() {
    }

    public changeStories(value: IStoryData[]): void {
        this.stories.next(value);
    }

    public changeVideoVolume(value: number): void {
        this.videoVolume.next(value);
    }

    public changeTrackWidth(value: number): void {
        this.storyTrackWidth.next(value);
    }

    public changeActiveUserIndex(index: number): void {
        this.activeUserIndex.next(index);
    }

    public closeStory(): void {
        this.activeStoryIndex.next(0);
    }

    public changeStoriesCount(value: number): void {
        this.storiesCount.next(value);
    }

    public changeUsersCount(value: number): void {
        this.usersCount.next(value);
    }

    public changeActiveStoryIndex(index: number): void {
        this.activeStoryIndex.next(index);
    }

    public nextStory(): void {
        if (this.usersCount.value === this.activeUserIndex.value + 1 && this.storiesCount.value === this.activeStoryIndex.value + 1) {
            this.changeActiveUserIndex(this.usersCount.value);
            this.changeActiveStoryIndex(0);
            return;
        }
        if (this.storiesCount.value === this.activeStoryIndex.value + 1) {
            this.changeActiveUserIndex(this.activeUserIndex.value + 1);
            this.changeTrackWidth(0);
            this.changeActiveStoryIndex(0);
            return;
        }
        this.changeActiveStoryIndex(this.activeStoryIndex.value + 1);
    }

    public prevStory(): void {
        const prevUserIndex = this.activeUserIndex.value - 1;
        const stories = this.stories.value;
        if (this.activeStoryIndex.value === 0) {
            this.changeActiveUserIndex(prevUserIndex);
            this.changeTrackWidth(0);
            this.changeActiveStoryIndex(stories[prevUserIndex].stories.length - 1);
            return;
        }
        this.changeActiveStoryIndex(this.activeStoryIndex.value - 1);
    }

}
