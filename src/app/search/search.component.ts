import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {FormBuilder, FormControl} from '@angular/forms'
import {HttpClient} from "@angular/common/http";
import {
  fromEvent,
  Subject,
  takeUntil,
  tap,
  debounceTime,
  delay
} from "rxjs";
import {SearchService} from "../search.service";

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
   searchInputControl: FormControl = this.fb.control('', []);
   resultSearchList : any[] = [];
   infiniteScrollObserver = new IntersectionObserver(
    ([entry], observer) =>{
      if(entry.isIntersecting){
        observer.unobserve(entry.target);
        if(this.remainItem > 0){
          this.isLoading = true;
          this.loadMorePage(this.searchInputControl.value, this.nextPage++);
        }
        this.ref.markForCheck();
      }
    }, {threshold: 1}
  )
  private destroy$ = new Subject();
  private nextPage = 2;
  private remainItem = 0;


  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private searchService: SearchService,
    private elementRef: ElementRef,
    private ref: ChangeDetectorRef) {}

  ngOnInit() {
    this.init();
  }

  init(){
    const searchResult = fromEvent<KeyboardEvent>(this.inputSearch.nativeElement,'keyup' ).pipe(
      tap( (event:KeyboardEvent) => {
        if(this.searchInputControl.value.length > 0 && event.code !== 'ArrowDown' && event.code !== 'ArrowLeft' && event.code !== 'ArrowRight'){
          this.isLoading = true;
          this.ref.markForCheck();
        }
        if(event.code === 'ArrowDown'){
          this.isLoading = false;
          this.focusResultFirstItem();
          this.ref.markForCheck();
        }
      }),
      debounceTime(1500),
      tap((event:KeyboardEvent) => {
        if(this.searchInputControl.value.length === 0){
          this.isLoading = false;
          this.resultSearchList = [];
          this.ref.markForCheck();
        }

        if(this.searchInputControl.value.length > 0 && event.code !== 'ArrowDown'){
          this.isNotResult = false;
          this.isSelectedItem = false;
          this.goToSearch(this.searchInputControl.value);
          this.ref.markForCheck();
        }
      }),
      takeUntil(this.destroy$)
    );

    searchResult.subscribe();
  }

  getErrorMessage() {
    return this.searchInputControl.hasError('pattern') ? 'only letters of the Latin alphabet' : '';
  }

  goToSearch(searchText: string):void{
    this.nextPage = 2;

    if(this.searchBlock?.nativeElement.firstElementChild && this.searchBlock.nativeElement.scrollTop > 0){
      this.searchBlock.nativeElement.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }

    this.searchService.getResult(searchText).pipe(
      tap((res) => {
       if(res.items){
         this.isLoading = false;
         this.remainItem = res.totalItems - res.endIndex;
         this.resultSearchList = res.items
         this.ref.markForCheck();
       }
       if(res.items.length === 0){
         this.isNotResult = true;
       }
      }),
      delay(1000),
      tap(() => {
        if(this.searchResult?.nativeElement.lastElementChild !== null){
          this.infiniteScrollObserver.observe(this.searchResult?.nativeElement.lastElementChild);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  loadMorePage(text:string, page:number){
    this.searchService.getResult(text, page).pipe(
      tap(res => {
        this.isLoading = false;
        this.remainItem = res.totalItems - res.endIndex;
        this.resultSearchList.push(...res.items);
        this.ref.markForCheck();
      }),
      delay(1000),
      tap(() => {
        if(this.searchResult?.nativeElement.lastElementChild !== null){
          this.infiniteScrollObserver.observe(this.searchResult?.nativeElement.lastElementChild);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  selectByClick(event: MouseEvent){
    const target = event.target as HTMLDivElement;
    this.searchInputControl.setValue(target.innerText);
    this.isSelectedItem = true;
    this.ref.markForCheck()
  }

  selectByKey(event: KeyboardEvent){
    if(event.code === 'Enter' || event.code === 'NumpadEnter'){
      const target = event.target as HTMLDivElement;
      this.searchInputControl.setValue(target.innerText);
      this.isSelectedItem = true;
      this.ref.markForCheck()
    }
    if(event.code === 'ArrowUp'){
      event.preventDefault();
      this.focusPreviousItem();
    }
    if(event.code === 'ArrowDown'){
      event.preventDefault();
      this.focusNextItem()
    }
  }

  private focusResultFirstItem(){
    if (this.searchResult.nativeElement.firstElementChild) {
      this.searchResult.nativeElement.firstElementChild.tabIndex = -1;
      this.searchResult.nativeElement.firstElementChild.focus();

    }
  }


  private focusNextItem() {
    const item  = document.activeElement as HTMLElement;
    if(item.nextElementSibling){
      this.activateFocus(item.nextElementSibling as HTMLElement);
      item.tabIndex = -1;
    }else{
      this.activateFocus( this.searchResult?.nativeElement.firstElementChild);
      item.tabIndex = -1;
    }
  }

  private focusPreviousItem() {
    const item  = document.activeElement as HTMLElement;
    if (item.previousElementSibling) {
      this.activateFocus(item.previousElementSibling as HTMLElement);
      item.tabIndex = -1;
    }else{
      this.activateFocus( this.searchResult?.nativeElement.lastElementChild);
      item.tabIndex = -1;
    }
  }

  private activateFocus(item:HTMLElement) {
    item.tabIndex = 0;
    item.focus();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

}
