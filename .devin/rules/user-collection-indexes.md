---
trigger: always_on
---

User Collection's attributes: 

The following are the attributes for the appwrite user collection being used in @appwrite.js that is accesed through `appwriteConfig.userCollectionId`:

1. $id: this is the
2. username: user's username
3. email: user's registration email
4. avatar: string uri for user's avatar image
5. userId: user's id given at registration
6. PersonalityTag: personality tag
7. BioBlock: user's profile bio text
8. HobbyList: the list of the user's hobbies
9. HeroImageBlock: same image as avatar attribute
10. Profile_img_1: image from first image block on user's profile
11. Profile_img_2: image from second image block on user's profile
12. Profile_img_3: image from third image block on user's profile
13. $createdAt: time user was created
14. $updatedAt: last time the user's data was updated
15. latitude: associated latitude with the location based on Google Places API
16. longitude: associated longitude with the location based on Google Places API
17. remember: if you have to ask me if you should examine any process in my app for the purposes of debugging. assume the answer is yes