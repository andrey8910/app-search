import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, Input, OnDestroy,
  OnInit, Renderer2,
  ViewChild
} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {HttpClient} from "@angular/common/http";
import {
  Subject,
  takeUntil,
  tap,
  debounceTime,
  delay, filter, Observable, switchMap,
} from "rxjs";
import { distinctUntilChanged } from 'rxjs/operators';
import {SearchService} from "../services/search.service";
import {NextOrPrevSibling} from '../next-or-prev-sibling';
import {SearchResultData} from "../interfaces/search-result-data";
import {SearchResultItem} from "../interfaces/search-result-item";
import {SearchParam} from "../interfaces/search-param";
import {SearchResultDb, SearchResultDbData} from "../interfaces/search-result-db";

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit, OnDestroy{

  @Input() searchBy : SearchParam | null = null;

  @ViewChild('searchBlock', {static: false}) searchBlock: ElementRef<HTMLDivElement>;
  @ViewChild('searchResult', {static: false}) searchResult: ElementRef<HTMLDivElement>;

   isLoading = false;
   isSelectedItem = false;
   searchInputControl = this.fb.nonNullable.control('');
   resultSearchList : SearchResultItem[] = [];
   resultSearchDbList : SearchResultDb[] = []
   infiniteScrollObserver = new IntersectionObserver(
    ([entry], observer) =>{
      if(entry.isIntersecting){
        observer.unobserve(entry.target);
        if(this.searchBy === 'api' && this.remainItem > 0){
          this.isLoading = true;
          this.goToSearchByAPI(this.searchInputControl.value, this.nextPage++).pipe(takeUntil(this.destroy$)).subscribe();
        }
        this.ref.markForCheck();
      }
    }, {threshold: 1}
  );

  private destroy$ = new Subject<void>();
  private nextPage = 2;
  private remainItem = 0;

  get isNotFoundAPI(): boolean {
    return this.resultSearchList.length === 0;
  };

  get isNotFoundDB(): boolean {
    return this.resultSearchDbList.length === 0;
  }

  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private searchService: SearchService,
    private elementRef: ElementRef,
    private ref: ChangeDetectorRef,
    private renderer: Renderer2
  ) {};

  ngOnInit(): void {
    this.init();
  };

  init(): void{

    this.searchInputControl.valueChanges.pipe(
      tap((value: string) => {
        this.isLoading = true;
        if(value.length === 0){
          this.isLoading = false;
          this.resultSearchList = [];
          this.isSelectedItem = false;
        }
        this.ref.markForCheck();
      }),
      filter((value: string) => value.length > 0),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap( (value: string): Observable<SearchResultData | SearchResultDbData> => this.goToSearch(value)),
      delay(1000),
      tap(() => {
        const searchResultList = this.searchResult?.nativeElement.querySelectorAll('.result-search-item');

        if(!searchResultList) {
          return
        }

        searchResultList.forEach((item) => {
          let itemIndex = item.getAttribute('index');

          if(item.classList.contains('last-item')){
            this.renderer.removeClass(item,'last-item')
          }

          if(itemIndex){
            +itemIndex === 0 ? this.renderer.addClass(item, 'first-item')
              : +itemIndex === searchResultList.length - 1 ? (this.renderer.addClass(item, 'last-item') , this.infiniteScrollObserver.observe(item))
                : this.renderer.addClass(item, 'search-item');
          }
        })
      }),
      takeUntil(this.destroy$),
    ).subscribe()
  };

  getErrorMessage(): string {
    return this.searchInputControl.hasError('pattern') ? 'only letters of the Latin alphabet' : '';
  };

  goToSearch(searchText: string): Observable<SearchResultData> | Observable<SearchResultDbData>{
    return this.searchBy === 'db' ? this.goToSearchByDB() : this.goToSearchByAPI(searchText);
  };

  goToSearchByDB(): Observable<SearchResultDbData>{
   return this.searchService.getUsersDB().pipe(
     tap((res: SearchResultDbData) => {
       this.isLoading = false;
       this.isSelectedItem = true;
       this.resultSearchDbList = res.users;
       this.ref.markForCheck();
     })
   )
  };

  goToSearchByAPI(searchText: string, page?: number): Observable<SearchResultData>{

    if(!page){
      this.nextPage = 2;
      if(this.searchBlock?.nativeElement.firstElementChild && this.searchBlock?.nativeElement.scrollTop > 0){
        this.searchBlock.nativeElement.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }
    }

   return this.searchService.getResultAPI(searchText.trim(),page).pipe(

      tap((searchResult: SearchResultData) => {
       if(searchResult.items.length > 0 && this.searchInputControl.value.length > 0){
         this.isLoading = false;
         this.isSelectedItem = true;
         this.remainItem = searchResult.totalItems - searchResult.endIndex;
         this.resultSearchList = [...this.resultSearchList, ...searchResult.items];
       }

       if(searchResult.items.length === 0){
         this.isLoading = false;
         this.resultSearchList = [];
         this.remainItem = 0;
         this.isSelectedItem = true;
       }
        this.ref.markForCheck();
      }),
      takeUntil(this.destroy$)
    )
  }

  selectByClick(value: string): void{
    this.searchInputControl.setValue(value, {emitEvent: false});
    this.isSelectedItem = false;
    this.ref.markForCheck()
  }

  selectByKey(event: KeyboardEvent, value: string): void{

    if(event.code === 'Enter' || event.code === 'NumpadEnter'){
      this.searchInputControl.setValue(value, {emitEvent: false});
      this.isSelectedItem = false;
    }

    if(event.code === 'ArrowUp' || event.code === 'ArrowDown'){
      event.preventDefault();
      this.focusSiblingItem(event.code);
    }

    this.ref.markForCheck()
  }

  focusResultFirstItem(): void{
    const firstItem = this.searchResult?.nativeElement.querySelector('.first-item') as HTMLDivElement;

    if(firstItem){
      firstItem.tabIndex = -1;
      firstItem.focus();
    }
  };

  private focusSiblingItem(keyCode: string): void {

    if(!(keyCode === 'ArrowUp' || keyCode === 'ArrowDown')){
      return
    }

    const item = document.activeElement as HTMLElement;
    const firstItem = this.searchResult?.nativeElement.querySelector('.first-item') as HTMLDivElement;
    const lastItem =this.searchResult?.nativeElement.querySelector('.last-item') as HTMLDivElement;

    if(!item[NextOrPrevSibling[keyCode]]){
      keyCode === 'ArrowUp'? this.activateFocus(lastItem) : this.activateFocus(firstItem);
      item.tabIndex = -1;

      return
    }

    if(item[NextOrPrevSibling[keyCode]]?.classList.contains('result-search-item')){
      this.activateFocus(item[NextOrPrevSibling[keyCode]] as HTMLElement);
      item.tabIndex = -1;
    }
  };

  private activateFocus(item:HTMLElement): void {
    item.tabIndex = 0;
    item.focus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
