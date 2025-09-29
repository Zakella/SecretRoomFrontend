
import { trigger, transition, style, animate } from '@angular/animations';

export const storyViewOpenAnimation = trigger('storyViewOpenAnimation', [
    transition('void => *', [
        style({
            opacity: 0
        }),
        animate(500, style({
            opacity: 1
        }))
    ]),
    transition('* => void', animate(300, style({
        opacity: 0,
    })))
]);
