import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlight'
})
export class HighlightPipe implements PipeTransform {

  transform(value: string, predicate: string): any {

    if (!value?.length) return 'not';
    if (!predicate?.length) return value ;

    return  value.replace(new RegExp(predicate, 'gi'), `<span class= "highlight">${predicate}</span>`);
  }

}
