import { Component } from '@angular/core';
import {Header} from './layout/header/header';
import {Footer} from './layout/footer/footer';
import {FloatingSidebar} from './layout/floating-sidebar/floating-sidebar';
import {Home} from './pages/home/home';

@Component({
  selector: 'app-root',
  imports: [Header, Footer, FloatingSidebar, Home],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
