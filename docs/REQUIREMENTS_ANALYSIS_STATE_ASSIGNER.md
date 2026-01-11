# State Assigner

This document outlines the requirements analysis for the new page /analysis/state-assigner.

The page is used to display a table of articles that have been assigned states with AI using the ArticleStateContract02 table. These need to be reviewed by a human to ensure the state is correct. The human can then approve the state or reject each article on this page

The page will be used to display a table component called TableReviewStateAssigner.

## API Endpoints necessary for this page

See the docs/api/analysis/state-assigner.md document for the API endpoints.

- POST /analysis/state-assigner/ - The page will call this endpoint to get the articles to display when it is first loaded.
- POST /analysis/state-assigner/human-verify/:articleId - The page will call this endpoint to approve a state for an article.
- GET /articles/article-details/:articleId - The page will call this endpoint to get the article details when the "details" button is clicked in the table.

## TableReviewStateAssigner

This table component displays the article id, title, url, state (from ArticleStateContract02). Then the table will have an action column with buttons, the first button will be "details", the second will be a check that is gray if isHumanApproved is false and green if true.

When the "details" button is clicked, it will open a modal with the article details. The modal will be called ModalStateAssignerDetails.

When the check button is clicked, it will make a call to the POST /analysis/state-assigner/human-verify/:articleId endpoint to approve the state for the article. It will need to send a body with the action and stateId.

The action will depend on the element from table's (or POST /analysis/state-assigner/ response) aritcles[articleIndex].stateAssigment.isHumanApproved.

If isHumanApproved is true, the action will be "reject".
If isHumanApproved is false, the action will be "approve".

The stateId will depend on the element from table's (or POST /analysis/state-assigner/ response) aritcles[articleIndex].stateAssigment.stateId.

## ModalStateAssignerDetails

This modal will display the article details.
This modal will make a call to the GET /articles/article-details/:articleId endpoint to get the article details. The modal will display the articleId and title at the top.

Below the title and id, we'll display if there is an `stateAiApproved` element/object, the state name the AI has approved. Below the state name dispaly the reasoning which is also an element in the `stateAiApproved` element / object.

Below this there should be a collapsable section for Human Approved. If there is a `stateHumanApprovedArray` element/object, the state name(s) the human has approved. Should be listed below. If no `stateHumanApprovedArray` element/object exists, it should display "No human approved states".

Below this there should be a collapsable section for Content. The content will be by default expanded.If the content is not available, it will display "Content not available". There should be a collapsable description that is just below content. If the description is not available, it will display "Description not available".

The bottom of the modal will have a "Approve" (or "Reject") button. The button will depend on the element from table's (or POST /analysis/state-assigner/ response) aritcles[articleIndex].stateAssigment.isHumanApproved.

If isHumanApproved is true, the button will be "Reject".
If isHumanApproved is false, the button will be "Approve".

If the user clicks this it will make a request to the POST /analysis/state-assigner/human-verify/:articleId endpoint.

The body of the request will be a JSON object with the following properties:

- action: "approve" or "reject" corresponding to the button clicked
- stateId: the stateId from table's (or POST /analysis/state-assigner/ response) aritcles[articleIndex].stateAssigment.stateId
