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
  fromEvent,
  Subject,
  takeUntil,
  tap,
  debounceTime,
  delay, map
} from "rxjs";
import { distinctUntilChanged } from 'rxjs/operators';
import {SearchService} from "../search.service";
import {NextOrPrevSibling} from '../next-or-prev-sibling';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit, OnDestroy{

  @ViewChild('inputSearch', {static: true}) inputSearch: ElementRef;
  @ViewChild('searchBlock', {static: false}) searchBlock: ElementRef;
  @ViewChild('searchResult', {static: false}) searchResult: ElementRef;

   isLoading = false;
   isNotResult = false;
   isSelectedItem = false;
   searchInputControl = this.fb.nonNullable.control('', []);
   resultSearchList : any[] = [];
   infiniteScrollObserver = new IntersectionObserver(
    ([entry], observer) =>{
      if(entry.isIntersecting){
        observer.unobserve(entry.target);
        if(this.remainItem > 0){
          this.isLoading = true;
          this.goToSearch(this.searchInputControl.value, this.nextPage++);
        }
        this.ref.markForCheck();
      }
    }, {threshold: 1}
  );

  private destroy$ = new Subject();
  private nextPage = 2;
  private remainItem = 0;


  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private searchService: SearchService,
    private elementRef: ElementRef,
    private ref: ChangeDetectorRef) {};

  ngOnInit(): void {
    this.init();
  };

  init(): void{
    fromEvent<InputEvent>(this.inputSearch.nativeElement,'input').pipe(
      tap((event : InputEvent) => {
        this.isLoading = true;
        if(this.inputSearch.nativeElement.value.length === 0){
              this.isLoading = false;
              this.resultSearchList = [];
              this.isSelectedItem = false;
              this.ref.markForCheck();
        }
        this.ref.markForCheck();
      }),
      map(() => this.searchInputControl.value),
      distinctUntilChanged(),
      debounceTime(1000),
      tap((searchValue : string) => {
        if(searchValue.length > 0){
          this.goToSearch(searchValue);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  getErrorMessage(): string {
    return this.searchInputControl.hasError('pattern') ? 'only letters of the Latin alphabet' : '';
  }

  goToSearch(searchText: string, page?: number):void{
    if(!page){
      this.nextPage = 2;
      if(this.searchBlock?.nativeElement.firstElementChild && this.searchBlock.nativeElement.scrollTop > 0){
        this.searchBlock.nativeElement.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }
    }

    this.searchService.getResult(searchText,page).pipe(
      tap((searchResult) => {
       if(searchResult.items){
         this.isLoading = false;
         this.isSelectedItem = true;
         this.remainItem = searchResult.totalItems - searchResult.endIndex;

         if(this.resultSearchList.length === 0){
           this.resultSearchList = searchResult.items;
         }else{
           this.resultSearchList.push(...searchResult.items);
         }

         this.ref.markForCheck();
       }

       if(searchResult.items.length === 0){
         this.isNotResult = true;
         this.resultSearchList = [];
         this.ref.markForCheck();
       }else{
         this.isNotResult = false;
         this.ref.markForCheck();
       }

      }),
      delay(1000),
      tap(() => {
        if(this.searchResult && this.searchResult?.nativeElement.lastElementChild !== null){
          this.infiniteScrollObserver.observe(this.searchResult?.nativeElement.lastElementChild);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  selectByClick(event: MouseEvent): void{
    const target = event.target as HTMLDivElement;
    this.searchInputControl.setValue(target.innerText);
    this.isSelectedItem = false;
    this.ref.markForCheck()
  }

  selectByKey(event: KeyboardEvent): void{

    if(event.code === 'Enter' || event.code === 'NumpadEnter'){
      const target = event.target as HTMLDivElement;
      this.searchInputControl.setValue(target.innerText);
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
      this.searchResult.nativeElement.firstElementChild.tabIndex = -1;
      this.searchResult.nativeElement.firstElementChild.focus();
    }
  };

  private focusSiblingItem(keyCode: string): void {
    const item = document.activeElement as HTMLElement;

    if(keyCode === 'ArrowUp' || keyCode === 'ArrowDown'){

      if(item[NextOrPrevSibling[keyCode]]){
        this.activateFocus(item[NextOrPrevSibling[keyCode]] as HTMLElement);
        item.tabIndex = -1;
      }else{
        keyCode === 'ArrowUp'? this.activateFocus( this.searchResult?.nativeElement.lastElementChild) : this.activateFocus( this.searchResult?.nativeElement.firstElementChild);
        item.tabIndex = -1;
      }
    }
  };

  private activateFocus(item:HTMLElement): void {
    item.tabIndex = 0;
    item.focus();
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

}
