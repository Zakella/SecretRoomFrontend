import { Component, inject, OnInit } from '@angular/core';
import {MetaService} from '../../@core/services/meta.service';
import {Language} from '../../@core/services/language';

@Component({
  selector: 'app-our-story',
  imports: [],
  templateUrl: './our-story.html',
  styleUrl: './our-story.scss'
})
export class OurStory implements OnInit {
  private metaService = inject(MetaService);
  private langService = inject(Language);

  protected activeLang = this.langService.currentLanguage;

  ngOnInit() {
    this.metaService.updateTitle('Despre Noi | Secret Room');
    this.metaService.updateDescription('Află povestea Secret Room - destinația ta pentru produse Victoria\'s Secret și Bath & Body Works în Moldova.');
    this.metaService.updateKeywords('Secret Room Moldova, despre noi, Victoria\'s Secret, Bath & Body Works, magazin parfumuri Chișinău');
    this.metaService.updateImage('https://secretroom.md/assets/images/SR-transparent.png');
  }
}
