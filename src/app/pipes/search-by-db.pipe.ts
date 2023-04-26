import { Pipe, PipeTransform } from '@angular/core';
import {SearchResultDb} from "../interfaces/search-result-db";

@Pipe({
  name: 'searchByDb'
})
export class SearchByDbPipe implements PipeTransform {

  transform(items: SearchResultDb[], searchText: string): SearchResultDb[] {
    if (!items) return [];
    if (!searchText) return items;

    return items.filter((item:any) => {
      return Object.keys(item).some(key => {
        return String(item[key]).toLowerCase().includes(searchText.toLowerCase());
      });
    });
  }

}
