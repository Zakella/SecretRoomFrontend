export interface StoryModel {
    data: IStoryData[];
}

export interface IStoryData {
    id: number;
    thumbnail: string;
    name: string;
    surname: string;
    stories: IStory[];
}
export interface IStory {
    id: number;
    image: string;
    video: string;
    views: number;
    hours_has_passed: number;
}
