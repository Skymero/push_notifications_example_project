---
description: generating your chronicles of debugging log
auto_execution_mode: 3
version: 2.0.0
---

1. 'Problem title': this is the general issue we are trying to solve
2. Strictly read through this entire conversation and understand the various problems that were solved. 
3. use the latest section, or add a new section, in the `DOCS\ChangeLog.md` with the latest changes that have been implemented but don't forget to crosscheck with the entire conversation to make sure that if the conversation has other issues we were addressing then you account for those too. 
4. file naming convention: {date: cod_MMM_ddyy}_{title} (`MMM` are the first three letters of the current month)
5. create the following markdown file template for each problem we are addressing:

```
## Problem title
### **Problem Summary**
- Give a comprehensive overview of the problem you're trying to solve

**Error/Terminal Output: **

Copy paste your terminal output 


- **Theory**: an initial theory as to what is causing the issue
- **What I've Tried**: explain steps you've taken to solve the issue based on this. 

### Debugging process [strict rule: be specific and verbose in this section]
- list out every debugging pattern that was used to debug this problem
    - **What I checked**: [description: what were the files, variables etc that you checked in this step. ]
    - **What hinted that this step was the right direction**: [description: what hinted that this step was the right direction. what did you expect to find in this step. why did the error or the issue point you in this direction. was it s aprevious debugging step that led you here? were you going through a process of elimination? what was the mindset here. I'd like you to explain it as if it was a play-by-play description of a football game. ]
    - **What did you find in this debugging step**: [description: if you checked a file, a variable, etc. explain what did you find even if it was not what you expected. ] 
    - **What this means for a beginner**: [description: explain what this means for a beginner.  ]

### Snippet

- In this section add the most important code snippet that helped achieve our solution along with detailed comments and an explanation of the code for a novice javascript and react native developer.

### Solution and implementation
- explain in detail how and why you implemented this problem/task/implementation
- explain why this solution is the best viable option for this bug/problem
- make sure to specify any component, code snippet, or functions used for each problem/bug fixed listen in the solution and implementation.

# Concepts
- a list of the concepts used through this debugging process that the user could study to help with this problem in the future

# Summary
- Summary of all tasks that were tackled in this conversation.
```

5. then create a markdown file in `C:\Users\ricky\REPOS\myapp\DOCS\CoD` and use the naming convention described in step 4.