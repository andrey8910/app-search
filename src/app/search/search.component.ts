import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, OnDestroy,
  OnInit,
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
import {SearchService} from "../search.service";
import {NextOrPrevSibling} from '../next-or-prev-sibling';
import {SearchResultData} from "../interfaces/search-result-data";
import {SearchResultItem} from "../interfaces/search-result-item";

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit, OnDestroy{

  @ViewChild('inputSearch', {static: true}) inputSearch: ElementRef<HTMLInputElement>;
  @ViewChild('searchBlock', {static: false}) searchBlock: ElementRef<HTMLDivElement>;
  @ViewChild('searchResult', {static: false}) searchResult: ElementRef<HTMLDivElement>;

   isLoading = false;
   isSelectedItem = false;
   searchInputControl = this.fb.nonNullable.control('');
   resultSearchList : SearchResultItem[] = [];
   infiniteScrollObserver = new IntersectionObserver(
    ([entry], observer) =>{
      if(entry.isIntersecting){
        observer.unobserve(entry.target);
        if(this.remainItem > 0){
          this.isLoading = true;
          this.goToSearch(this.searchInputControl.value.trim(), this.nextPage++).pipe(takeUntil(this.destroy$)).subscribe();
        }
        this.ref.markForCheck();
      }
    }, {threshold: 1}
  );

  private destroy$ = new Subject<void>();
  private nextPage = 2;
  private remainItem = 0;

  get isNotFound(): boolean {
    return this.resultSearchList.length === 0;
  }


  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private searchService: SearchService,
    private elementRef: ElementRef,
    private ref: ChangeDetectorRef
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
          this.ref.markForCheck();
        }
        this.ref.markForCheck();
      }),
      filter((value: string) => value.length > 0),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap( (value: string): Observable<SearchResultData> => this.goToSearch(value.trim())),
      takeUntil(this.destroy$),
    ).subscribe()
  }

  getErrorMessage(): string {
    return this.searchInputControl.hasError('pattern') ? 'only letters of the Latin alphabet' : '';
  }

  goToSearch(searchText: string, page?: number): Observable<SearchResultData>{

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

   return this.searchService.getResult(searchText,page).pipe(

      tap((searchResult: SearchResultData) => {
       if(searchResult.items.length > 0 && this.searchInputControl.value.length > 0){
         this.isLoading = false;
         this.isSelectedItem = true;
         this.remainItem = searchResult.totalItems - searchResult.endIndex;
         this.resultSearchList = [...this.resultSearchList, ...searchResult.items];
         this.ref.markForCheck();
       }

       if(searchResult.items.length === 0){
         this.isLoading = false;
         this.resultSearchList = [];
         this.remainItem = 0;
         this.isSelectedItem = true;
         this.ref.markForCheck();
       }

      }),
      delay(1000),
      tap(() => {
        if(this.searchResult && this.searchResult.nativeElement.lastElementChild !== null){
          this.infiniteScrollObserver.observe(this.searchResult.nativeElement.lastElementChild);
        }
      }),
      takeUntil(this.destroy$)
    )
  }

  selectByClick(event: MouseEvent): void{
    const target = event.target as HTMLDivElement;
    this.searchInputControl.setValue(target.innerText, {emitEvent: false});
    this.isSelectedItem = false;
    this.ref.markForCheck()
  }

  selectByKey(event: KeyboardEvent): void{

    if(event.code === 'Enter' || event.code === 'NumpadEnter'){
      const target = event.target as HTMLDivElement;
      this.searchInputControl.setValue(target.innerText, {emitEvent: false});
      this.isSelectedItem = false;
      this.ref.markForCheck()
    }

    if(event.code === 'ArrowUp' || event.code === 'ArrowDown'){
      event.preventDefault();
      this.focusSiblingItem(event.code)
    }
  }

  focusResultFirstItem(keyup: KeyboardEvent): void{
    if(keyup.code === 'ArrowDown' && this.searchResult.nativeElement.firstElementChild){
      (this.searchResult.nativeElement.firstElementChild as HTMLDivElement).tabIndex  = -1 ;
      (this.searchResult.nativeElement.firstElementChild as HTMLDivElement).focus();
    }
  };

  private focusSiblingItem(keyCode: string): void {
    const item = document.activeElement as HTMLElement;

    if(keyCode === 'ArrowUp' || keyCode === 'ArrowDown'){

      if(item[NextOrPrevSibling[keyCode]]){
        this.activateFocus(item[NextOrPrevSibling[keyCode]] as HTMLElement);
        item.tabIndex = -1;
      }else{
        keyCode === 'ArrowUp'? this.activateFocus( this.searchResult.nativeElement.lastElementChild as HTMLDivElement) : this.activateFocus( this.searchResult.nativeElement.firstElementChild as HTMLDivElement);
        item.tabIndex = -1;
      }
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
