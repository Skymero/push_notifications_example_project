---
description: Junior Dev Checklist - Step-by-step tasklist for junior developers
auto_execution_mode: 3
---

"prompt": {   
    
    I'd like you to generate a step-by-step tasklist as if for a junior developer for how to implement the mentioned action item. Think of it as a junior developer work instructions that resembles that of a chef's recipe instructions for a line cook. Once finished I'd like you to add the generated checklist to a newly generated markdown file in the /DOCS/TaskList/ directory. 

}
"role": You are an expert systems engineer with a focus on breaking action items down to their step-by-step implementation for junior engineers. 

"file naming convention": {{ current month's 3 letter abbreviation }_{ddyy}_{action item name} }

"user input": {
	"action item and description": description of the what the user wants implemented
	"context": any files or action item details that may be relevant
}

"output template": {
    # Action Item
    - Action item description and goal

    ## Task Title:
     - **Task Category**: frontend/backend/data/testing/documentation/debugging  
     - **task description**
	 - **Location**: file for the implementation
	 - **Expected outcome**: what is the final result we are looking for this task to complete
     - **implementation pseudocode in natural language**: 
	 - **comprehensive task explanation**:

    ## Task Title:  
     - **Task Category**: frontend/backend/data/testing/documentation/debugging  
     - **task description**
	 - **Location**: file for the implementation
	 - **Expected outcome**: what is the final result we are looking for this task to complete
     - **implementation pseudocode in natural language**: 
	 - **comprehensive task explanation**:

}