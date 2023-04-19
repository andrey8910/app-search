import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map, Observable} from "rxjs";
import {SearchResultData} from "./interfaces/search-result-data";


@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(private httpClient: HttpClient) { }

  public getResult(searchText: string, page = 1): Observable<SearchResultData>{
    return this.httpClient.get<SearchResultData>(`https://chroniclingamerica.loc.gov/search/titles/results/?terms=${searchText}&format=json&page=${page}`).pipe(
      map((res:SearchResultData) => {
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
