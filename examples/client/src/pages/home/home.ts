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
    selectFile({ multiple: true }).then(files => {
      let f: () => Promise<string | string[]>;
      if (files.length === 1) {
        console.log('file:', files[0]);
        f = () => this.fileProvider.postSingleFile(files[0]);
      } else {
        console.log('files:', files);
        f = () => this.fileProvider.postMultipleFiles(files);
      }
      f().then(res => {
        console.log('res:', res);
      }).catch(err => {
        console.log('err:', err);
      });
    });
  }
}
