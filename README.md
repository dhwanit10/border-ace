# Secure Identity Guardian

I have uploaded an image of our workflow, this is a web application in which it is document screening and fraud detection platform, our backend is ready, in this application there are majorly 2-3 workflows. i will explain you how the workflow works and you have to make that, also do not use mock data, i will provide you each and every api with their url and request response data. and you have to connect that api to get the data. there are around 16-17 apis. our app will first have login page, no sign up page. in the login page it should ask username, password, and system to be selected from dropdown. to get the system data, you have this api http://localhost:8000/api/v1/system/get-offline store the base address in the .env file, it gives you reponse like this {
  "total": 1,
  "systems": [
    {
      "id": 1,
      "system_name": "SYS-001",
      "status": "offline",
      "primary_owner_id": 1,
      "sessions": [
        {
          "id": 2,
          "start_time": "2026-08-29T19:35:22.601083",
          "end_time": "2026-08-29T20:59:51.740577",
          "start_date": "2026-08-29T00:00:00",
          "end_date": "2026-08-29T00:00:00",
          "no_of_cases": 3,
          "officer_id": 1
        },
        {
          "id": 3,
          "start_time": "2026-08-30T10:11:32.319437",
          "end_time": "2026-08-30T10:26:32.662392",
          "start_date": "2026-08-30T00:00:00",
          "end_date": "2026-08-30T00:00:00",
          "no_of_cases": 1,
          "officer_id": 2
        }
      ]
    }
  ]
} you have to render the name of system which is offline in that dropdown. now comes the login api, which is this http://localhost:8000/api/v1/users/login and its request body is {
  "username": "yash",
  "password": "Yash@123",
  "system_id": 1
} and it gives response like {
  "success": true,
  "user_id": 2,
  "username": "yash",
  "user_type": "officer",
  "system_id": 1,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U",
  "token_type": "bearer"
} from this store the access token for jwt, user id, and system id, user type will be helped to get into officer dashboard or admin dashboard, after the login, one page will open which will ask for face scan, as in workflow, user will allow the camera access, and click on the capture btn, you will click the image and send that image to this api curl -X 'POST' \
  'http://localhost:8000/api/v1/verification/verify-user' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' \
  -H 'Content-Type: multipart/form-data' \
  -F 'user_id=2' \
  -F 'system_id=1' \
  -F 'image=@WIN_20260829_12_27_55_Pro.jpg;type=image/jpeg' i have given you this curl so that you will get all info, it will response like this {
  "success": true,
  "user_id": 2,
  "system_id": 1,
  "session_id": 4,
  "username": "yash",
  "full_name": "Yash Sonrat",
  "face_match_score": 0.8723,
  "message": "User verified successfully"
} if the success is true then only open the dashboard either admin or officer as per the usertype, if it is false get back to login page show toast message. also store the session id from this response, this api might take some time so show cool animations like real time stuff face scanning, image embedding, face verified etc things. this was the login process for both admin and officer. now lets come to main part 


- In the officer dashboard as you see there will be two options in the navbar and one logout btn. the 1. is start case, 2. history. the 1 is opened by default, it will have only one btn in middle which will be start new Case. user clicks on it and it will ask for file upload, user upload an image of documents like passport, aadhar etc and it will be previewed on the screen, with three btn, change doc, start ocr, and cancel. when user clicks start ocr, you will call this api curl -X 'POST' \
  'http://localhost:8000/api/v1/workflow/upload-document' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@images (1).jpg;type=image/jpeg' \
  -F 'user_id=2' and it will gives you response like this {
  "doc_id": 14,
  "extracted_data": {
    "full_name": "Father : Vishnu Kumar Jaiswal",
    "doc_number": "726983799603",
    "doc_type": "aadhar",
    "gender": "Female",
    "nationality": "Indian",
    "dob": "1981-09-08",
    "issue_date": null,
    "expiry_date": null,
    "mrz_no": null,
    "address": null
  },
  "ocr_confidence": 98.49
} in this there are various fields you will show this in a good format in the left side of screen and there will be btn on right side, if the doc type is aadhar then do not show mrz no. show the doc type in top in middle as text. all other fields are changable so keep all other fields as input and load this data in that inputs. also show the ocr confidence somewhere the btn will be start face scan, upload again, cancel. when it selects scan face it will open the camera, and have capture btn, user will use capture btn to click the picture of his face, and then you will call this api curl -X 'POST' \
  'http://localhost:8000/api/v1/workflow/verify-person' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' \
  -H 'Content-Type: multipart/form-data' \
  -F 'doc_id=14' \
  -F 'doc_data={"full_name":"Father : Vishnu Kumar Jaiswal","doc_number":"726983799603","doc_type":"aadhar","gender":"Female","nationality":"Indian","dob":"1981-09-08","issue_date":null,"expiry_date":null,"mrz_no":null,"address":null}' \
  -F 'person_image=@pass1.jpeg;type=image/jpeg' \
  -F 'officer_id=2' \
  -F 'session_id=4' \
  -F 'ocr_confidence=0.99' with the required data. officer id is user id only, doc id will be received in previous call and doc data is nothing but extracted data from above call with changes done by officer in previous page if there's an error in ocr so we choose input at that time. the reponse of this api will look like {
  "verification_id": 5,
  "risk_id": 5,
  "face_match_score": 0.042583853006362915,
  "ocr_confidence": 0.99,
  "mrz_validation": false,
  "tampering_probability": 11.57416146993637,
  "status": "pending"
} now you will display this info, only required info, like face match score, tempering, status, ocr, mrz only if passport. here you will have btns like 
    APPROVED = "approved"
    UNDER_INVESTIGATION = "under_investigation"
    REJECTED = "rejected"
    this are the Enum field for the next api, if user clicks any one of the btn, call this api curl -X 'POST' \
  'http://localhost:8000/api/v1/workflow/update-status' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' \
  -H 'Content-Type: application/json' \
  -d '{
  "risk_id": 5,
  "status": "rejected",
  "description": "face not match",
  "session_id": 4
}' above this btn you will have description box to take description which is optional. statuc will be the btn clicked, and it will give reponse like {
  "success": true,
  "risk_id": 5,
  "status": "rejected",
  "session_cases": 1
}, after this you will prompt user back to start page with the btn start new case. so this was our main workflow. 

- in the history tab you have to call this api curl -X 'GET' \
  'http://localhost:8000/api/v1/data/history?officer_id=2' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' with the user id as query in url as officer id only. it will give reponse like this {
  "total": 2,
  "data": [
    {
      "verification_id": 5,
      "date_time_recorded": "2026-08-31T10:49:40.769431",
      "document": {
        "id": 14,
        "full_name": "Father : Vishnu Kumar Jaiswal",
        "doc_number": "726983799603",
        "doc_type": "aadhar",
        "gender": "Female",
        "nationality": "Indian",
        "dob": "1981-09-08",
        "issue_date": null,
        "expiry_date": null,
        "mrz_no": null,
        "address": null
      },
      "risks": [
        {
          "id": 5,
          "ocr_confidence": 0.99,
          "mrz_validation": false,
          "tampering_probability": 11.57416146993637,
          "face_match_score": 0.042583853006362915,
          "database_verification": true,
          "approved": false,
          "status": "rejected",
          "description": "face not match",
          "verifier_admin_id": null
        }
      ],
      "officer": {
        "id": 2,
        "username": "yash",
        "full_name": "Yash Sonrat",
        "user_type": "officer",
        "status": "online"
      },
      "session": {
        "id": 4,
        "start_time": "2026-08-31T10:33:51.204646",
        "end_time": null,
        "start_date": "2026-08-31T00:00:00",
        "end_date": null,
        "no_of_cases": 1
      },
      "system": {
        "id": 1,
        "system_name": "SYS-001",
        "status": "online"
      }
    },
    {
      "verification_id": 4,
      "date_time_recorded": "2026-08-30T10:18:58.392849",
      "document": {
        "id": 13,
        "full_name": "ASHISH LEON BARDOLE",
        "doc_number": "M8497609",
        "doc_type": "passport",
        "gender": "Male",
        "nationality": "1ND",
        "dob": "1994-07-13",
        "issue_date": "2015-04-27",
        "expiry_date": "2025-04-26",
        "mrz_no": "P<INDBARDOLE<<ASHISH<LEON<<<<<<<<<<<<<<<<<<<\nM8497609<91ND9407130M2504269<<<<<<<<<<<<<<<8",
        "address": null
      },
      "risks": [
        {
          "id": 4,
          "ocr_confidence": 0.99,
          "mrz_validation": false,
          "tampering_probability": 11.740567561239004,
          "face_match_score": 0.025943243876099586,
          "database_verification": true,
          "approved": false,
          "status": "rejected",
          "description": "face not match",
          "verifier_admin_id": null
        }
      ],
      "officer": {
        "id": 2,
        "username": "yash",
        "full_name": "Yash Sonrat",
        "user_type": "officer",
        "status": "online"
      },
      "session": {
        "id": 3,
        "start_time": "2026-08-30T10:11:32.319437",
        "end_time": "2026-08-30T10:26:32.662392",
        "start_date": "2026-08-30T00:00:00",
        "end_date": "2026-08-30T00:00:00",
        "no_of_cases": 1
      },
      "system": {
        "id": 1,
        "system_name": "SYS-001",
        "status": "online"
      }
    }
  ]
} and you have to show this reponse in great manner, do not show everything in row, for each row show doc number, doc type, system name, risk status. add search bar which search on every column, also everyrow will have action btn eye, clicking it, will open modal which will contain every info about that case, when user clicks on that btn, call this two api curl -X 'GET' \
  'http://localhost:8000/api/v1/documents/photo/14' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' replace 14 with doc id user clicked on, and it will give the photo of document to render and similarly, curl -X 'GET' \
  'http://localhost:8000/api/v1/documents/person-image/14' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' it will give you person image during the face scan so render this also. in the modal display every bit of useful information in a proper manner.  

this same history thing is implemented in admin side also, but there will be officer name also displayed in the row, so that admin gets the idea of the officer, also in admin side remove the officer id query in the history get api, so admin will get every info every data. and other things remain same



officer side is complete there is only this 2 things on officer side. 


now comes to admin, the login this is same, using the usertype you decide this is admin, it should have beautiful and professional theme and design. by default the systems list will be displayed i dashboard, to get the system list this is the api curl -X 'GET' \
  'http://localhost:8000/api/v1/system/get' \
  -H 'accept: application/json' which gives reponse like {
  "total": 1,
  "systems": [
    {
      "id": 1,
      "system_name": "SYS-001",
      "status": "online",
      "primary_owner_id": 1,
      "sessions": [
        {
          "id": 2,
          "start_time": "2026-08-29T19:35:22.601083",
          "end_time": "2026-08-29T20:59:51.740577",
          "start_date": "2026-08-29T00:00:00",
          "end_date": "2026-08-29T00:00:00",
          "no_of_cases": 3,
          "officer_id": 1
        },
        {
          "id": 3,
          "start_time": "2026-08-30T10:11:32.319437",
          "end_time": "2026-08-30T10:26:32.662392",
          "start_date": "2026-08-30T00:00:00",
          "end_date": "2026-08-30T00:00:00",
          "no_of_cases": 1,
          "officer_id": 2
        },
        {
          "id": 4,
          "start_time": "2026-08-31T10:33:51.204646",
          "end_time": null,
          "start_date": "2026-08-31T00:00:00",
          "end_date": null,
          "no_of_cases": 1,
          "officer_id": 2
        }
      ]
    }
  ]
}, system have online and offline status, so make sure you have filter of this and render them separate, also every system has session list, so give a btn, and on clicking i will get to know about the sessions of that system. now here there is user id in system. so call this api curl -X 'GET' \
  'http://localhost:8000/api/v1/users/' \
  -H 'accept: application/json' to get all the user data,{
  "success": true,
  "total_users": 2,
  "users": [
    {
      "user_id": 1,
      "username": "dhwanit",
      "full_name": "Patel Dhwanit",
      "dob": "2005-10-10",
      "gender": "male",
      "aadhar_no": "12345678909",
      "phone": "9988776655",
      "email": "dhwanit@gmail.com",
      "user_type": "officer",
      "status": "offline",
      "has_face_image": false
    },
    {
      "user_id": 2,
      "username": "yash",
      "full_name": "Yash Sonrat",
      "dob": "2006-08-10",
      "gender": "Male",
      "aadhar_no": "212345678987",
      "phone": "1234567890",
      "email": "yash@gmail.com",
      "user_type": "officer",
      "status": "offline",
      "has_face_image": true
    }
  ]
}  and display the user name and name, of user, and have eye action btn to open the full details of the user, if the end time in session is missing or null it means the session is active. this get api of user will be helful to get user list and admin and another tab named users which will display user list with name, username, status, etc and eye action btn to open details of that user in modal. with the image of user, you will get it here curl -X 'GET' \
  'http://localhost:8000/api/v1/documents/user-face/2' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' just change the 2 in the url with the user id whose details are clicked on. back to systems tab. it will have create system btn on top right, which will ask for value which is this {
  "system_name": "string",
  "primary_owner_id": 0
} primary owner is nothing but the admin id currently logged in, so it will only ask for system name, and this is post request curl -X 'POST' \
  'http://localhost:8000/api/v1/system/create' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "system_name": "my-system",
  "primary_owner_id": 2
}' it will give some reponse and this is my reponse {
  "detail": "Primary owner must be an admin"
} as i have given officer id. in the systems list you will also has this primary owner, so display that user info also, just name, email, phone just this. in user tab. there will be create new user btn which will ask for this info {
  "username": "string",
  "full_name": "string",
  "dob": "2026-08-31",
  "gender": "string",
  "aadhar_no": "string",
  "phone": "string",
  "email": "user@example.com",
  "user_type": "officer",
  "password": "string"
} user type will be officer or admin. gender is also drop down male or female. the aadhar number will only of 12 digits, phone number of 10 digits and put email validation also the post api for this is curl -X 'POST' \
  'http://localhost:8000/api/v1/users/create' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "username": "fenil",
  "full_name": "fenil patel",
  "dob": "2026-08-31",
  "gender": "male",
  "aadhar_no": "168762876872",
  "phone": "9809829382",
  "email": "user@example.com",
  "user_type": "admin",
  "password": "Fenil@123"
}' this, it will give reponse like this {
  "user_id": 3,
  "username": "fenil",
  "password": "Fenil@123",
  "user_type": "admin"
} store it temporary, and open the camera on this reponse to capture the image of new user face which will be used to get login later, the api to upload image is this curl -X 'POST' \
  'http://localhost:8000/api/v1/users/upload-face' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'user_id=3' \
  -F 'image=@WhatsApp Image 2026-08-30 at 00.24.20.jpeg;type=image/jpeg' where the user id here is new user generated id, it will give reponse like this {
  "success": true,
  "user_id": 3,
  "username": "fenil",
  "full_name": "fenil patel",
  "user_type": "admin",
  "has_face_image": true,
  "message": "Face image uploaded successfully"
} show toast message of this.

as told earlier admin has the history section also. 

the last is logout api which is for both officer and admin the api for that curl -X 'POST' \
  'http://localhost:8000/api/v1/auth/logout' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Inlhc2giLCJ1c2VyX3R5cGUiOiJvZmZpY2VyIiwic3lzdGVtX2lkIjoxLCJleHAiOjE3ODgxNzkzNDl9.5ehXHX8Q3kD3f803ExGL4VLnuptuE5DtoKqDH9ZGE_U' \
  -H 'Content-Type: application/json' \
  -d '{
  "session_id": 4,
  "user_id": 2
}' is this, it will give reponse like {
  "success": true,
  "session_id": 4,
  "user_id": 2,
  "system_id": 1,
  "end_time": "2026-08-31T11:32:08.759947",
  "system_status": "offline",
  "user_status": "offline"
}, show toast and get back to login page. also delete the jwt token and everything remaining which could be expose.

so this was the whole flow of our application from login to logout. 

now comes the design part. the design across all the pages component, btn should be consistent. it should be professional. the layout should look good premium and sophisticated. this is the website used by border security in airports mainly so use theme around that. also make light and dark theme both and have toggle btn. each text, photo should be visible and looks good. use unique but good fonts which are readable. use poppins or baloo bhai 2. the website should look professional, elegant and beautiful. do not use any shade of blue, violet, purple, orange. use any different color shade but not this.  take the workflow image as reference only

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9c1b7c2e-e2fd-4175-9347-31b529917320).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
