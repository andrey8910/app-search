import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {tap} from "rxjs";
import {SearchResultData} from "./interfaces/search-result-data";


@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(private httpClient: HttpClient) { }

  public getResult(searchText: string, page = 1){
    return this.httpClient.get<SearchResultData>(`https://chroniclingamerica.loc.gov/search/titles/results/?terms=${searchText}&format=json&page=${page}`).pipe(
      tap(res => {
        const searchResult : SearchResultData = {
          endIndex : res.endIndex,
          items: res.items.map(item => ({title:item.title})),
          itemsPerPage: res.itemsPerPage,
          startIndex: res.startIndex,
          totalItems: res.totalItems,
        };

        return searchResult;
      })
    )
  }

}
