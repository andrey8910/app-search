import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(private httpClient: HttpClient) { }

  public getResult(searchText: string, page = 1){
    return this.httpClient.get<any>(`https://chroniclingamerica.loc.gov/search/titles/results/?terms=${searchText}&format=json&page=${page}`)
  }

}
