# Appwrite Backend Configuration

## Project

name: My Project
description: Example Appwrite backend configuration

---

# Databases
## Database: main

id: main
name: Main Database

---

### Table: users

id: users
name: Users

permissions:

* read: users
* create: users
* update: users
* delete: users

---

#### Columns

* name: username
  id: username
  type: varchar
  size: 100
  required: true
  default: null

* name: email
  id: email
  type: email
  required: true
  default: null

* name: bio
  id: bio
  type: text
  required: false
  default: null

* name: age
  id: age
  type: integer
  required: false
  default: null

* name: isActive
  id: is_active
  type: boolean
  required: true
  default: true

* name: createdAt
  id: created_at
  type: datetime
  required: true
  default: null

---

#### Indexes

* name: username_unique
  id: username_unique
  type: unique
  columns:

  * username

* name: email_unique
  id: email_unique
  type: unique
  columns:

  * email

---

#### Relationships

# No relationships required for this table.

---

### Table: sessions

id: sessions
name: Sessions

permissions:

* read: users
* create: users
* update: users
* delete: users

---

#### Columns

* name: title
  id: title
  type: varchar
  size: 150
  required: true
  default: null

* name: description
  id: description
  type: text
  required: false
  default: null

* name: startTime
  id: start_time
  type: datetime
  required: true
  default: null

* name: endTime
  id: end_time
  type: datetime
  required: false
  default: null

* name: capacity
  id: capacity
  type: integer
  required: false
  default: null

---

#### Indexes

* name: start_time_index
  id: start_time_index
  type: key
  columns:

  * start_time

---

#### Relationships

* name: owner
  id: owner
  related_table: users
  type: many_to_one
  two_way: false
  on_delete: restrict

---

### Table: messages

id: messages
name: Messages

permissions:

* read: users
* create: users

---

#### Columns

* name: body
  id: body
  type: text
  required: true
  default: null

* name: createdAt
  id: created_at
  type: datetime
  required: true
  default: null

---

#### Indexes

* name: created_at_index
  id: created_at_index
  type: key
  columns:

  * created_at

---

#### Relationships

* name: sender
  id: sender
  related_table: users
  type: many_to_one
  two_way: false
  on_delete: restrict

* name: session
  id: session
  related_table: sessions
  type: many_to_one
  two_way: false
  on_delete: cascade

---

# Storage Buckets

## Storage Bucket: profile-images

id: profile_images
name: Profile Images

permissions:

* read: users
* create: users
* update: users
* delete: users

max_file_size: 5000000

allowed_extensions:

* jpg
* jpeg
* png
* webp

encryption: true
compression: gzip
antivirus: true

---

## Storage Bucket: session-images

id: session_images
name: Session Images

permissions:

* read: users
* create: users
* update: users
* delete: users

max_file_size: 10000000

allowed_extensions:

* jpg
* jpeg
* png
* webp

encryption: true
compression: gzip
antivirus: true

---

# Configuration Rules

## Supported Column Types

The configuration may use:

* varchar
* text
* mediumtext
* longtext
* integer
* bigint
* float
* boolean
* datetime
* email
* url
* enum

Relationship fields should be defined under the Relationships section rather than inside Columns.

---

## Varchar Requirements

Every varchar column must define:

```text
size
```

Example:

```yaml
- name: username
  id: username
  type: varchar
  size: 100
  required: true
```

---

## Enum Example

```yaml
- name: status
  id: status
  type: enum
  required: true
  values:
    - pending
    - active
    - cancelled
  default: pending
```

---

## Float Example

```yaml
- name: latitude
  id: latitude
  type: float
  required: false
  min: -90
  max: 90
```

---

## Integer Example

```yaml
- name: capacity
  id: capacity
  type: integer
  required: false
  min: 1
  max: 500
```

---

## Relationship Example

```yaml
- name: owner
  id: owner
  related_table: users
  type: many_to_one
  two_way: false
  on_delete: restrict
```

Supported relationship types should initially be limited to:

```text
one_to_one
one_to_many
many_to_one
many_to_many
```

---

## Index Example

```yaml
- name: username_unique
  id: username_unique
  type: unique
  columns:
    - username
```

Supported index types:

```text
key
unique
fulltext
```

---

# Minimal Example

A very small configuration could look like this:

```markdown
# Appwrite Backend Configuration

## Project

name: Example App

# Databases

## Database: main

id: main
name: Main Database

### Table: users

id: users
name: Users

#### Columns

- name: username
  id: username
  type: varchar
  size: 100
  required: true

- name: email
  id: email
  type: email
  required: true

#### Indexes

- name: email_unique
  id: email_unique
  type: unique
  columns:
    - email

#### Relationships

# None

# Storage Buckets

## Storage Bucket: profile-images

id: profile_images
name: Profile Images

max_file_size: 5000000

allowed_extensions:
- jpg
- png
- webp
```

---

# Recommended Parsing Hierarchy

The parser should interpret the Markdown hierarchy as:

```text
# Appwrite Backend Configuration

    ## Project

    # Databases

        ## Database

            ### Table

                #### Columns

                #### Indexes

                #### Relationships

    # Storage Buckets

        ## Storage Bucket
```

The heading levels therefore have semantic meaning.

For example:

```text
## Database: main
```

starts a new database definition.

```text
### Table: users
```

starts a table belonging to the current database.

```text
#### Columns
```

starts the column definitions belonging to the current table.

---

# Recommended Naming Rules

IDs should use:

```text
lowercase
snake_case
```

Preferred:

```text
profile_images
created_at
session_participants
```

Avoid:

```text
Profile Images
created-At
Session Participants!
```

Display names can remain human-readable:

```yaml
id: profile_images
name: Profile Images
```

This separation makes the configuration easier for both humans and Appwrite.

---

# Recommended File Structure

A project using the bot could look like:

```text
my-project/
│
├── backend.md
├── .env
│
├── .appwrite/
│   └── appwrite.manifest.json
│
├── reports/
│
└── app/
```

The responsibilities are:

```text
backend.md
    Human-readable desired Appwrite infrastructure.

.env
    Appwrite endpoint, project ID, API key.

appwrite.manifest.json
    Machine-readable compiled representation.

reports/
    Results from apply operations.
```

---

# Example Environment File

The Markdown configuration should not contain credentials.

Use:

```text
.env
```

instead:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key
```

The bot reads these credentials separately from `backend.md`.

---

# Intended Workflow

```text
Developer edits backend.md
        ↓
appwrite-bot validate backend.md
        ↓
appwrite-bot compile backend.md
        ↓
appwrite.manifest.json
        ↓
appwrite-bot plan backend.md
        ↓
Review proposed changes
        ↓
appwrite-bot apply backend.md
        ↓
Appwrite updated
```

