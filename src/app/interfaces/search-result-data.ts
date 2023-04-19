import {SearchResultItem} from './search-result-item'

export interface SearchResultData{
  endIndex: number;
  items: SearchResultItem[];
  itemsPerPage: number;
  startIndex: number;
  totalItems: number;
}
