import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, SecurityContext, ViewChild } from "@angular/core";
import { AnnotationToolsService } from '../annotation-tools.service';
import { RXCore } from 'src/rxcore';
import { RxCoreService } from "src/app/services/rxcore.service";
import { CompareService } from "../../compare/compare.service";
import { TopNavMenuService } from "../../top-nav-menu/top-nav-menu.service";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
//import Dompurify from 'dompurify'
import { debounce } from "lodash-es";

@Component({
  selector: 'rx-search-panel',
  templateUrl: './search-panel.component.html',
  styleUrls: ['./search-panel.component.scss'],
  host: {
    '(window:resize)': 'onWindowResize($event)'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPanelComponent implements OnInit {
    visible: boolean = false;
    openedFiles: any = [];
    searchOptions: Record<number, {
        id: number,
        text: string,
        caseSensitive: boolean,
        wholeWord: boolean;
        numMatches: number,
        currentMatches: number
    }> = [];
    activeFile: any = null;
    search: string = "";
    panelwidth : number = 300;
    searchCaseSensitive: boolean = false;
    searchWholeWord: boolean = false;
    searchNumMatches: number = 0;
    searchCurrentMatches: number = 0;
    activeFileId: number = 0;
    searchResult: any[] = [];
    splitedResult: any[] = [];
    pageIndex: any[] = [];
    isSearching: boolean = false;
    currentItem = null;
    scrollY = 0;
    bDown: boolean = true;

    currentScrollItem: number = 0;

    constructor(
    private sanitizer: DomSanitizer,
    private readonly rxCoreService: RxCoreService,
    private readonly compareService: CompareService,
    private readonly service: TopNavMenuService,
    private cdr: ChangeDetectorRef,
    private readonly annotationToolsService: AnnotationToolsService) {
        this.onScroll = debounce(this.onScroll.bind(this), 300);
    }

    ngOnInit(): void {
        this.annotationToolsService.searchPanelState$.subscribe(state => {
            this.visible = state?.visible;
            this.cdr.markForCheck()
            if(this.visible){
                RXCore.setLayout(this.panelwidth, 0, false);
                RXCore.doResize(false,this.panelwidth, 0);/*added for comment list panel */
            }else{
                RXCore.setLayout(0, 0, false);
                RXCore.doResize(false,0, 0);/*added for comment list panel */
            }
            RXCore.toggleShowHighlightMarkups(this.visible)
        })


        RXCore.onGuiDocumentSearch((matches) => {
            this.searchNumMatches = 0;
            let id = 0;
            this.pageIndex = []
            matches.forEach((match: any) => {
                this.searchNumMatches += match.list.length;
                    match.list.forEach(item => {
                        item.match.id = id
                        id ++;
                        this.pageIndex.push(match.pgindex)
                    })  
            })
            RXCore.markupSearchResult()
            this.isSearching = false;
            this.searchCurrentMatches = 0;
            this.searchResult = matches;

            //not sure what this is supposed to do currently this makes the list empty. modified to retun result.
            //this.splitedResult = this.searchResult.slice(0, this.getPageNumFromId(Math.min(40, this.searchResult.length)))
            this.splitedResult = this.searchResult.slice(0, Math.min(40, this.searchResult.length))
            console.log(matches)
            this.cdr.markForCheck()
        })

        this.rxCoreService.guiFileLoadComplete$.subscribe((value) => {
            this.openedFiles = this._getOpenFilesList()
            this.openedFiles.forEach(file => {
                if(!this.searchOptions[file.id]) {
                    this.searchOptions[file.id] = {
                        id: file.id,
                        text: "",
                        caseSensitive: false,
                        wholeWord: false,
                        currentMatches: 0,
                        numMatches: 0
                    }
                }
            })
        })

        this.service.closeTab$.subscribe(file => {
            if(this.searchOptions[file.id]) {
                const {[file.id]: _, ...rest} = this.searchOptions
                this.searchOptions = rest;
            }
            if(Object.keys(this.searchOptions).length === 0) {
                this.activeFileId = -1;
                this.search = "";
                this.searchCaseSensitive = false;
                this.searchWholeWord = false;
                this.searchCurrentMatches = 0;
                this.searchNumMatches = 0;
                this.splitedResult = [];
                this.searchResult = [];
                this.currentScrollItem = 0;
            }
            this.cdr.markForCheck()
        })

        this.service.activeFile$.subscribe(file => {
            if(this.searchOptions[this.activeFileId]) {
                this.searchOptions[this.activeFileId] = {
                    id: this.activeFileId,
                    text: this.search,
                    caseSensitive: this.searchCaseSensitive,
                    wholeWord: this.searchWholeWord,
                    currentMatches: this.searchCurrentMatches,
                    numMatches: this.searchNumMatches,
                }
            }
            const option = this.searchOptions[file.id]

            if(option) {
                this.activeFileId = file.id
                this.search = option.text;
                this.searchCaseSensitive  = option.caseSensitive
                this.searchWholeWord = option.wholeWord;
                this.searchCurrentMatches = option.currentMatches;
                this.searchNumMatches = option.numMatches;
                this.splitedResult = [];
                this.searchResult = [];
                this.currentScrollItem = 0;
                RXCore.documentTextSearch(this.search, this.searchCaseSensitive, this.searchWholeWord)
            }

            this.cdr.markForCheck()
        })
    }

    onWindowResize(event): void {
    }

    private _getOpenFilesList(): Array<any> {
        const hidden = new Set<number>();
        return RXCore.getOpenFilesList().map(file => {
        const comparison = this.compareService.findComparisonByFileName(file.name);
        if (comparison) {
            hidden.add(comparison.activeFile.index);
            hidden.add(comparison.otherFile.index);
        }
        return { ...file, comparison};
        }).map(file => {
        file.hidden = hidden.has(file.index);
        return file;
        });
    }

    getPageNumFromId(id: number) {
        return this.pageIndex[id] ;
    }

    onScroll(event: MouseEvent) {
        try {
            const DELTA = 0;
            const target = (event.target as HTMLDivElement)
            let start = 0, end = 0
            this.bDown = target.scrollTop <= this.scrollY
            console.log(this.bDown)
            if(target.scrollTop <= DELTA) {
                this.currentScrollItem -= 20;
                if(this.currentScrollItem > 40) {
                    target.scrollTop = target.clientHeight / 2
                }
            }
            else if (target.scrollTop + target.clientHeight >= target.scrollHeight - DELTA) {
                this.currentScrollItem += 20;
            }
            
            this.currentScrollItem = Math.max(40, this.currentScrollItem);
            this.currentScrollItem = Math.min(this.currentScrollItem, this.searchNumMatches);
            
            end = this.currentScrollItem
            start = Math.max(0, end - 40)
            console.log(this.getPageNumFromId(end), end, this.getPageNumFromId(start), start)
            end = this.getPageNumFromId(end)
            start = this.getPageNumFromId(start)
            this.splitedResult = this.searchResult.slice(start, end)
            this.scrollY = target.scrollTop;
            this.cdr.markForCheck()
        } catch (err) {
            console.log(err)
        }
        
    }

    removeDangerousTags(rootElement: HTMLElement, tags: string[]): void {
        tags.forEach(tag => {
            const elements = rootElement.getElementsByTagName(tag);
            while (elements.length > 0) {
            const element = elements[0];
            while (element.firstChild) {
                element.parentNode?.insertBefore(element.firstChild, element);
            }
            element.parentNode?.removeChild(element);
            }
        });
    }


    sanitizeHtml(html: string): SafeHtml {
        const div = document.createElement('div');
        div.innerHTML = html;
        
        this.removeDangerousTags(div, ['script', 'img', 'iframe', 'object', 'embed', 'link', 'base', 'form', 'svg'])
        return this.sanitizer.bypassSecurityTrustHtml(div.innerHTML);
    }

    onClose(): void {
        this.visible = false;
        RXCore.setLayout(0, 0, false);
        RXCore.doResize(false, 0, 0);/*added for comment list panel */
        RXCore.toggleShowHighlightMarkups(false)
        this.onReset()
        this.rxCoreService.setCommentSelected(false)
        RXCore.clearDocumentTextSearch()
    }

    onSearchItemClick(item: any) {
        this.searchCurrentMatches = item.match.id;
        this.currentItem = item;
        const page = this.getPageNumFromId(this.searchCurrentMatches)
        RXCore.gotoPage(page)
        RXCore.markupTextWithOrange(this.currentItem)
    }

    onReset() {
        this.search = ""
        this.searchResult = []
        this.splitedResult = []
        this.searchCurrentMatches = 0;
        this.searchNumMatches = 0;
        RXCore.markUpHighlight(false)
        this.cdr.markForCheck()
    }

    onSearch(event): void {
        RXCore.endTextSearch();
        if(!this.search) {
            this.onReset()
        } else if(this.search.length >= 2) {
            this.isSearching = true;
            RXCore.documentTextSearch(this.search, this.searchCaseSensitive, this.searchWholeWord);
        }
        this.cdr.markForCheck()
    }

    highlightCurrentItem() {

    }

    onTextSearchNavigate(mode: boolean) {
        if(mode) {
            if(this.searchCurrentMatches < this.searchNumMatches - 1) {
                this.searchCurrentMatches ++;
            }
        } 
        else {
            if(this.searchCurrentMatches > 0) {
                this.searchCurrentMatches --;
            }
        } 
        const page = this.getPageNumFromId(this.searchCurrentMatches)
        RXCore.gotoPage(page)
        this.searchResult[page].list.forEach(item => {
            if(item.match.id === this.searchCurrentMatches) {
                this.currentItem = item
                RXCore.markupTextWithOrange(this.currentItem)
            }
        })
    }
}
