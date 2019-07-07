import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { FileProvider } from '../../providers/file/file';
import { selectFile } from '@beenotung/tslib/file';
import { setBaseUrl } from 'nest-client';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage {

  constructor(
    public navCtrl: NavController,
    public fileProvider: FileProvider,
  ) {
  }

  uploadFile() {
    setBaseUrl('http://localhost:3000');
    selectFile().then(files => {
      console.log('files:', files);
      this.fileProvider.postMultipleFiles(files).then(res => {
        console.log('res:', res);
      }).catch(err => {
        console.log('err:', err);
      });
    });
  }
}
