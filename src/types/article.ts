// Shared Article type for the application
export interface Article {
	id: number;
	title: string;
	publicationName: string;
	publishedDate: string;
	description: string;
	url: string;
	content?: string;
	isApproved?: boolean;
	isBeingReviewed?: boolean;
	isRelevant?: boolean;
	States?: Array<{ id: number; name: string }>;
	statesStringCommaSeparated?: string;
	requestQueryString?: string;
	nameOfOrg?: string;
	semanticRatingMax?: number | string;
	locationClassifierScore?: number | string;
}

// Article Report Contract (junction table between articles and reports)
export interface ArticleReportContract {
	id: number;
	articleId: number;
	reportId: number;
	articleReferenceNumberInReport: string;
	isAccepted: boolean;
	rejectionReason?: string | null;
}

// Approved Article type for reports page (extends Article with report-specific fields)
export interface ApprovedArticle extends Article {
	stageArticleForReport: boolean;
	isSubmitted?: boolean;
	stateAbbreviation?: string;
	articleHasBeenAcceptedByAll?: boolean;
	ArticleReportContracts: ArticleReportContract[];
}

// Request type for article requests analysis page
export interface ArticleRequest {
	id: number;
	nameOfOrg: string;
	andString: string;
	orString?: string;
	notString?: string;
	includeOrExcludeDomainsString?: string;
	countOfApprovedArticles: number;
}

// Unassigned article type for count by state analysis
export interface UnassignedArticle {
	id: number;
	title: string;
	url: string;
}

// State count data type - uses Record for dynamic column keys
export type StateCountData = Record<string, string | number>;

// ArticleApproved record from AI approval system
export interface ArticleApproved {
	id: number;
	artificialIntelligenceId: number;
	createdAt: string;
	isApproved: boolean;
	headlineForPdfReport: string;
	publicationNameForPdfReport: string;
	publicationDateForPdfReport: string;
	textForPdfReport: string;
	urlForPdfReport: string;
	kmNotes: string;
}

// ChatGPT Approved Article type for ChatGPT analysis page
export interface ChatGPTApprovedArticle extends Article {
	author?: string;
	urlToImage?: string;
	entityWhoFoundArticleId?: number;
	newsApiRequestId?: number | null;
	newsRssRequestId?: number | null;
	createdAt?: string;
	stateAbbreviation?: string;
	ArticlesApproved02: ArticleApproved[];
}
