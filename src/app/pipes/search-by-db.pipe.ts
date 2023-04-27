import { Pipe, PipeTransform } from '@angular/core';
import {SearchResultDb} from "../interfaces/search-result-db";

@Pipe({
  name: 'searchByDb'
})
export class SearchByDbPipe implements PipeTransform {

  transform(items: SearchResultDb[], searchText: string, searchFields: string[]): SearchResultDb[] {
    if (!items) return [];
    if (!searchText) return items;


    return items.filter((item:SearchResultDb) => {
      return Object.keys(item).some((key: string) => {
        let searchField: string | null = null;
        let res = false;

        searchFields.forEach((f:string) => {
          const field = f.replace(/\s+/g, '').trim();
          field === key ? searchField = field : searchField = null;

          if(searchField && searchFields.length > 0){
            res = item[searchField as keyof SearchResultDb].toString().toLowerCase().includes(searchText.toLowerCase())
          }

        })

        if(searchFields.length === 0){
          res = item[key as keyof SearchResultDb].toString().toLowerCase().includes(searchText.toLowerCase())
        }

        return res

      });
    });
  }

}
