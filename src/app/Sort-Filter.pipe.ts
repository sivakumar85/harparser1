import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'sortFilter' })
export class SortFilterPipe implements PipeTransform {
  key: string;

  transform(items: Array<String>, key: string, asc: boolean) {
    this.key = key;
    if (items) {
      if (asc) {
        return items.sort((item1: any, item2: any) => {
          if (!item2[this.key]) return -1;
          else if (!item1[this.key]) return 1;
          else if (item1[this.key] > item2[this.key]) return 1;
          else if (item1[this.key] === item2[this.key]) return 0;
          else return -1;
        });
      } else {
        return items.sort((item1: any, item2: any) => {
          if (!item2[this.key]) return 1;
          else if (!item1[this.key]) return -1;
          else if (item1[this.key] < item2[this.key]) return 1;
          else if (item1[this.key] === item2[this.key]) return 0;
          else return -1;
        });
      }
    }
  }
}
