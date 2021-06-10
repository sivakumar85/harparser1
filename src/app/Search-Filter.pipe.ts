import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'searchFilter' })
export class SearchFilterPipe implements PipeTransform {
  transform(
    items: Array<String>,
    filter: { [key: string]: any }
  ): Array<String> {
    if (items) {
      return items.filter(item => {
        let match: boolean = true;
        for (var k in filter) {
          if (filter[k] && filter[k] != '') {
            if (typeof item[k] == 'boolean') {
              let val: boolean = filter[k] == 'true';
              if (item[k] != val) {
                match = false;
              }
            } else {
              if (
                item[k] &&
                item[k] != '' &&
                item[k]
                  .toString()
                  .toLowerCase()
                  .indexOf(filter[k].toString().toLowerCase()) == -1
              )
                match = false;
            }
          }
        }
        return match;
      });
    }
  }
}
