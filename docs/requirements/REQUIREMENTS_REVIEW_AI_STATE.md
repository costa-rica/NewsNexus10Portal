# Add AI State to TableReviewArticles Table

In our TableReviewArticles component (found in the src/app/(dashboard)/articles/review/page.tsx file), we need to add a column called "State (AI Assigned)". This will essentially be the functionaltiy found in the src/components/tables/TableReviewStateAssigner.tsx and src/components/ui/modal/ModalStateAssignerDetails.tsx components where the user can accept or reject the state assignment.

The src/app/(dashboard)/articles/review/page.tsx file already makes a call to the POST /articles/with-ratings endpoint which provides the state name but from the ArticleStateContract table. This should stay the same. Also it recieves other information that should also stay the same such as semanticRatingMax, isRelevant, etc.

We have modified the endpoint POST /articles/with-ratings to provide the stateAssignment object from the ArticleStateContract02 table - see docs/api/articles.md for the updated response. This is the object that has the AI assigned state information we need for this new column and to render the ModalStateAssignerDetails component.

The "State (AI Assigned)" column will display the state name from the stateAssignment object. It will be a button so that if the user clicks on it, it will open the ModalStateAssignerDetails component. Where the user will have the option to accept the state or reject it. The button will appear styled as a link with the color blue, just like the ID and url columns.

If anything is not clear, please ask questions. If this is not possible, please explain why.

## API Endpoint modification

We need to modify the POST /articles/with-ratings endpoint to include the stateAssignment object in the response. This will facilitate the frontend to display the AI assigned state and the ModalStateAssignerDetails component from the TableReviewArticles component. Currently the POST /analysis/state-assigner/ endpoint provides an array where each array element has a stateAssignment object that has the AI assigned state information we need for this new column and to render the ModalStateAssignerDetails component. Please reivew the POST /analysis/state-assigner/ endpoint response and add the stateAssignment object to the response from the POST /articles/with-ratings endpoint.

New element property in the response from the POST /articles/with-ratings endpoint

```json
    "stateAssignment": {
    "promptId": 5,
    "isHumanApproved": false,
    "isDeterminedToBeError": false,
    "occuredInTheUS": true,
    "reasoning": "Article mentions specific location in California and describes product safety incident",
    "stateId": 5,
    "stateName": "California"
    }
```

If anything is unclear please ask questions. If this is not possible please explain why.
