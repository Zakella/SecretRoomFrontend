import { Component, inject, OnInit } from '@angular/core';
import {MetaService} from '../../@core/services/meta.service';

@Component({
  selector: 'app-our-story',
  imports: [],
  templateUrl: './our-story.html',
  styleUrl: './our-story.scss'
})
export class OurStory implements OnInit {
  private metaService = inject(MetaService);

  ngOnInit() {
    this.metaService.updateTitle('Despre Noi | Secret Room');
    this.metaService.updateDescription('Află povestea Secret Room - destinația ta pentru produse Victoria\'s Secret și Bath & Body Works în Moldova.');
  }
}
