---
description: Generate a a function level natural language pseudocode
auto_execution_mode: 3
---


generate a function natural language pseudocode of the mentioned process

example in the desired format: 
{
    
    Function: getValidMenuChoice

    Parameters:

    prompt: the message to display to the user
    minimumChoice: the smallest valid menu number
    maximumChoice: the largest valid menu number
    Process:

    1. Initialize response as an empty string
    2. Initialize selectedChoice to an invalid value (less than minimumChoice)
    3. While selectedChoice is outside the valid range (less than minimum or greater than maximum):
        a. Display the prompt to the user
        b. Read the user's entire response as a string
        c. Reset selectedChoice to 0
        d. Assume the response contains only digits (set containsOnlyDigits to true if response is not empty)
        e. For each character in the response:
            If the character is not a digit (0-9), mark containsOnlyDigits as false
            Otherwise, build the number by multiplying current selectedChoice by 10 and adding the digit value
        f. If the response contained any non-digit characters, reset selectedChoice to an invalid value
        g. If selectedChoice is still outside the valid range, display an error message showing the valid range
    Return the validated selectedChoice
    Purpose: Keeps prompting the user until they enter a valid integer within the specified range, rejecting any input containing non-digit characters.
        
}