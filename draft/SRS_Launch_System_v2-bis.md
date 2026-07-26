**SOFTWARE REQUIREMENTS SPECIFICATION**

Launch Purchase Order, Material Planning, Stock,

Delivery, and Finance Follow-Up System

| Document Version | 2.0                                                         |
| ---------------- | ----------------------------------------------------------- |
| Status           | Under Review - Pending Business Confirmation on Open Points |
| Prepared by      | Hosni                                                       |
| Date             | 04 June 2025                                                |

# Revision History

| **Version** | **Date**     | **Author** | **Description**                                                                                                    |
| ----------- | ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| 1.0         | 04 June 2026 | Hosni      | Initial reorganized draft from source requirements                                                                 |
| 2.0         | 04 June 2026 | Hosni      | Added acceptance criteria; added User Management module; clarified PDF input, BOM Excel upload, CutMan integration |

# 1\. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for a system that supports the launch department in managing purchase orders, launch planning, material availability, warehouse stock movements, delivery follow-up, and finance-related recovery tracking.

## 1.2 Scope

The system covers the following business areas:

- User management and access control
- Project management
- Purchase order intake (PDF parsing), extraction, validation, correction, versioning, and comparison
- Launch manufacturing simulation based on material availability
- Bill of Material management via Excel file upload
- Material stock management including CutMan software integration for WIP stock
- Material delivery from warehouse to manufacturing
- Purchase order production tracking
- Customer delivery tracking
- Finance recovery and sales forecasting
- Dashboards and monitoring
- Audit documentation and traceability

## 1.3 Definitions and Abbreviations

| **Term**        | **Definition**                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| PO              | Purchase Order                                                                                                                     |
| JIT             | Just-In-Time customer                                                                                                              |
| BOM             | Bill of Material                                                                                                                   |
| FGPN            | Finished Goods Part Number                                                                                                         |
| WIP             | Work-in-Progress stock remaining in the manufacturing or cutting area                                                              |
| SRS             | Software Requirements Specification                                                                                                |
| CutMan          | External cutting management software used to track material consumed in the cutting area; outputs data as Excel file or SQL script |
| Launch Engineer | Authorized user responsible for launch operations on assigned projects                                                             |
| Launch Manager  | Senior launch user with read visibility across all projects                                                                        |
| BP              | Best Practice - a recommended approach based on standard software engineering or manufacturing traceability practice               |

# 2\. Overall Description

## 2.1 System Context

The system serves a manufacturing launch department. Its primary purpose is to reduce manual data entry errors, improve traceability, provide visibility on project and purchase order status, and support decisions related to launching manufacturing based on available and planned material stock.

## 2.2 Assumptions and Dependencies

- Purchase orders are submitted as PDF documents. The PDF is the authoritative source document and must be stored as submitted.
- Bill of Material data is provided by authorized launch users as an Excel file upload. The system parses the uploaded Excel file to load BOM data.
- Remaining usable WIP stock in the cutting and manufacturing area is sourced from the CutMan software, which exports data as an Excel file or SQL script.
- Stock data for warehouse reception originates from warehouse user entries in the system.
- Predefined reference lists are maintained within the system and populated before operational use begins.
- All launch operations require a meeting and associated meeting minutes document.
- The system is a multi-user environment. Multiple users may be active simultaneously.

## 2.3 External Interfaces Summary

| **External Source** | **Data Provided**                                 | **Format**                  |
| ------------------- | ------------------------------------------------- | --------------------------- |
| JIT Customer        | Purchase Order document                           | PDF                         |
| Launch Engineer     | Bill of Material                                  | Excel file (.xlsx)          |
| CutMan Software     | Remaining WIP stock in cutting/manufacturing area | Excel (.xlsx) or SQL script |

# 3\. Roles and Permissions

This section defines each role and its system-wide access boundaries. Detailed per-module permissions are specified within each module section.

## 3.1 Role Definitions

### R01 - Plant Manager

The Plant Manager has read-only monitoring access across all projects and dashboards. The Plant Manager cannot create, modify, or delete any business data in any module. See Open Point OP-03.

### R02 - Launch Manager

The Launch Manager is a senior launch role with read visibility across all projects, including projects not assigned to them. The Launch Manager does not modify data on projects they do not own. On projects they are directly responsible for, the Launch Manager has full operational write access equivalent to the Launch Engineer. See Open Point OP-02.

### R03 - Launch Engineer

The Launch Engineer is the primary operational owner of the system for their assigned projects. The Launch Engineer manages projects, purchase orders, simulations, stock thresholds, finance forecasts, and documents for assigned projects only.

### R04 - Warehouse Team Leader

The Warehouse Team Leader has access only to stock reception functions and warehouse-to-manufacturing delivery functions. This role records received stock quantities, generates stock and inventory documents, accesses delivery instructions via a generated code, generates the warehouse-to-manufacturing delivery document, and uploads the signed reception document.

### R05 - Warehouse Personnel

Warehouse personnel can record received material quantities where permitted by the business process. Warehouse personnel cannot access any other system area. See Open Point OP-04.

### R06 - Manufacturing Receiver

The Manufacturing Receiver signs the delivery document when goods arrive from the warehouse. The receiver's name is selected from a predefined list. This role does not have active system access.

### R07 - System Administrator

The System Administrator manages user accounts, role assignments, project-to-user assignments, and predefined reference lists. The System Administrator has no access to business data.

## 3.2 Role-Permission Summary Matrix

Read = view only. Own = access limited to assigned projects only. NA = No access.

| **Capability**             | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** | **Sys. Admin** |
| -------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- | -------------- |
| Monitor all projects       | Read          | Read All       | Own only        | NA         | NA            | NA             |
| Manage own projects        | NA            | Write (own)    | Write (own)     | NA         | NA            | NA             |
| Manage purchase orders     | NA            | Write (own)    | Write (own)     | NA         | NA            | NA             |
| Run launch simulations     | NA            | Write (own)    | Write (own)     | NA         | NA            | NA             |
| Manage stock thresholds    | NA            | Write (own)    | Write (own)     | NA         | NA            | NA             |
| Record stock reception     | NA            | NA             | NA              | Write      | Write         | NA             |
| Correct locked reception   | NA            | Write (own)    | Write (own)     | NA         | NA            | NA             |
| Access delivery via code   | NA            | NA             | NA              | Write      | NA            | NA             |
| Upload signed delivery doc | NA            | NA             | NA              | Write      | NA            | NA             |
| Manage finance/forecasts   | NA            | Write (own)    | Write (own)     | NA         | NA            | NA             |
| View stock history         | NA            | Read (own)     | Read (own)      | NA         | NA            | NA             |
| Monitor dashboards         | Read          | Read All       | Own only        | NA         | NA            | NA             |
| Manage user accounts       | NA            | NA             | NA              | NA         | NA            | Write          |
| Manage reference lists     | NA            | NA             | NA              | NA         | NA            | Write          |

# 4\. Module Specifications

## M00 - User Management

### M00.1 Purpose

Manage system user accounts, role assignments, project assignments, and predefined reference lists. This module is operated exclusively by the System Administrator.

### M00.2 Functional Requirements - User Accounts

**M00-FR-01** The system shall allow the System Administrator to create user accounts.

**M00-FR-02** Each user account shall include at minimum: full name, username, role assignment, and active/inactive status.

**M00-FR-03** The system shall allow the System Administrator to assign one role per user from the defined role list: Plant Manager, Launch Manager, Launch Engineer, Warehouse Team Leader, Warehouse Personnel.

**M00-FR-04** The system shall allow the System Administrator to deactivate a user account. A deactivated account shall not be able to log in. Deactivated accounts shall not be deleted so that traceability of past actions is preserved.

**M00-FR-05** The system shall allow the System Administrator to reactivate a previously deactivated account.

**M00-FR-06** The system shall allow the System Administrator to change a user's role assignment.

### M00.3 Functional Requirements - Project Assignment

**M00-FR-07** The system shall allow the System Administrator to assign one or more Launch Engineers or Launch Managers to a project as responsible users.

**M00-FR-08** A Launch Engineer shall only access a project if they have been assigned to it.

**M00-FR-09** When a Launch Engineer is unassigned from a project, they shall immediately lose access to that project's data. Their historical actions on the project shall remain in the audit trail.

### M00.4 Functional Requirements - Authentication

**M00-FR-10** The system shall require each user to authenticate before accessing any function.

**M00-FR-11** Authentication shall use a username and password at minimum.

**M00-FR-12** The system shall lock a user account after 5 consecutive failed login attempts. Only the System Administrator shall be able to unlock it.

**M00-FR-13** The system shall maintain a log of all login events (successful and failed) including timestamp and username.

### M00.5 Functional Requirements - Reference List Management

**M00-FR-14** The System Administrator shall be able to create, update, and deactivate entries in the following predefined reference lists: JIT Customers, Contact Names, Finished Goods Part Numbers per project, Manufacturing Receivers, Delivery Methods, Material Types.

**M00-FR-15** Entries in reference lists shall support active/inactive status. Inactive entries shall not appear in selection dropdowns but shall remain visible in historical records that referenced them.

**M00-FR-16** The system shall prevent deletion of any reference list entry that is linked to existing records.

### M00.6 BP - Principle of Least Privilege

**BP:** Each user shall be granted only the minimum access required to perform their defined role. No user shall accumulate permissions from multiple roles. If a user changes roles, their account must be explicitly updated by the System Administrator. Old permissions are not inherited.

### M00.7 BP - Account Deactivation on Departure

**BP:** When a user leaves the organization, their account shall be deactivated, not deleted. This preserves the full audit trail of actions performed under that account while preventing further access. The System Administrator shall be the sole authority for deactivation.

### M00.8 Acceptance Criteria

**M00-AC-01** Given a System Administrator account, when a new user is created with a role and active status, then the user can log in and access only the functions defined for their role.

**M00-AC-02** Given an active user account, when the System Administrator deactivates it, then the user cannot log in and receives a clear access-denied message.

**M00-AC-03** Given a Launch Engineer account assigned to Project A but not Project B, when the user logs in, then Project B is not visible or accessible.

**M00-AC-04** Given a user who has entered an incorrect password 5 consecutive times, when they attempt a 6th login, then the account is locked and only the System Administrator can unlock it.

**M00-AC-05** Given a reference list entry linked to one or more existing records, when the System Administrator attempts to delete it, then the system prevents the deletion and displays an explanatory message.

**M00-AC-06** Given a deactivated reference list entry, when a user opens a historical record that referenced it, then the entry is still displayed correctly in that record.

### M00.9 Role Access for This Module

| **Action**                  | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** | **Sys. Admin** |
| --------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- | -------------- |
| Create/modify user accounts | No            | No             | No              | No         | No            | Yes            |
| Assign roles                | No            | No             | No              | No         | No            | Yes            |
| Assign users to projects    | No            | No             | No              | No         | No            | Yes            |
| Manage reference lists      | No            | No             | No              | No         | No            | Yes            |
| View login audit log        | No            | No             | No              | No         | No            | Yes            |

## M01 - Project Management

### M01.1 Purpose

Provide the ability to create, manage, and monitor projects. A project is the top-level grouping entity under which purchase orders and all related operations are organized.

### M01.2 Functional Requirements

**M01-FR-01** The system shall allow authorized launch users to create new project records before any purchase order is submitted against the project.

**M01-FR-02** The system shall allow the Launch Engineer assigned to a project to consult, update, and delete that project's record.

**M01-FR-03** The system shall support a one-to-many relationship between a project and its purchase orders.

**M01-FR-04** The system shall provide a project monitoring view displaying at minimum: project name, number of purchase orders, current statuses, and assigned engineer.

**M01-FR-05** The Plant Manager shall be able to view all projects with no create, update, or delete capability.

**M01-FR-06** The Launch Engineer shall only see and access projects to which they have been assigned by the System Administrator.

**M01-FR-07** The Launch Manager shall be able to view all projects in read-only mode. The Launch Manager can create, update, and delete records only on projects assigned to them.

### M01.3 BP - Project Existence Before Purchase Order

**BP:** A purchase order shall not be accepted into the system unless a project record already exists to receive it. This prevents orphaned purchase order records. The system shall enforce this by requiring the user to select an existing project when submitting a purchase order.

### M01.4 Acceptance Criteria

**M01-AC-01** Given a Launch Engineer assigned to Project A, when they log in and navigate to the project list, then only Project A is visible.

**M01-AC-02** Given a Plant Manager account, when the user navigates to the project list, then all projects are visible and no create, edit, or delete controls are present.

**M01-AC-03** Given a Launch Manager account, when the user navigates to the project list, then all projects are visible in read mode and only projects assigned to that Launch Manager show edit controls.

**M01-AC-04** Given no existing project for a customer, when a launch user attempts to submit a purchase order, then the system requires an existing project to be selected and does not allow submission without one.

**M01-AC-05** Given a project that has associated purchase orders, when the Launch Engineer attempts to delete it, then the system prevents deletion and displays an explanatory message.

### M01.5 Role Access for This Module

| **Action**        | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ----------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| View all projects | Read          | Read All       | Own only        | No         | No            |
| Create project    | No            | Yes (own)      | Yes (own)       | No         | No            |
| Update project    | No            | Yes (own)      | Yes (own)       | No         | No            |
| Delete project    | No            | Yes (own)      | Yes (own)       | No         | No            |

## M02 - Purchase Order Intake, Extraction, and Validation

### M02.1 Purpose

Allow authorized users to submit purchase order documents in PDF format, automatically parse and extract key business data from the PDF, validate that data against reference lists, and support user review and correction prior to storage.

### M02.2 Functional Requirements - Document Submission

**M02-FR-01** The system shall accept purchase order documents in PDF format only.

**M02-FR-02** The system shall allow an authorized launch user to upload a PDF file and associate it with an existing project.

**M02-FR-03** The system shall determine whether the uploaded PDF is a valid Covers Purchase Order document before extraction is attempted. Validation shall check document structure and expected field presence.

**M02-FR-04** If the uploaded PDF is not identified as a valid Covers Purchase Order, the system shall reject the document, display a clear rejection message identifying the reason, and prevent extraction.

**M02-FR-05** The system shall store the original uploaded PDF file regardless of validation outcome, for audit purposes.

### M02.3 Functional Requirements - PDF Parsing and Extraction

**M02-FR-06** The system shall parse the validated PDF and extract the fields in the table below.

| **#** | **Field**                         | **Extraction Condition**                 |
| ----- | --------------------------------- | ---------------------------------------- |
| 1     | JIT Customer                      | Always                                   |
| 2     | Contact Information               | Always                                   |
| 3     | Document Date                     | Always                                   |
| 4     | Delivery Date                     | Always                                   |
| 5     | Item                              | Always                                   |
| 6     | Finished Goods Part Number (FGPN) | Always                                   |
| 7     | Development Level                 | Always                                   |
| 8     | Quantity                          | Always                                   |
| 9     | Unit Price                        | Always                                   |
| 10    | Reason of Purchase Order          | Always                                   |
| 11    | Purchase Order Number             | Where present in document \[Always\]     |
| 12    | Delivery Week                     | Derived from Delivery Date where present |
| 13    | Car Model                         | Where present                            |
| 14    | Engineering Phase Level           | Where present                            |
| 15    | Color Code                        | Where present                            |
| 16    | Description                       | Where present                            |
| 17    | Trim Code                         | Where present                            |
| 18    | Purchase Order Level              | Where present                            |
| 19    | Pick-Up Date                      | Where present                            |
| 20    | Pick-Up Week                      | Derived from Pick-Up Date where present  |

**M02-FR-07** The system shall support multi-line purchase orders. A single PDF may contain multiple line items, each with its own FGPN, quantity, and unit price. Each line shall be extracted and stored independently.

**M02-FR-08** When a field marked Always cannot be located in the PDF, the system shall flag that field as missing and require the user to provide the value manually before the record can be confirmed.

### M02.4 Functional Requirements - Validation

**M02-FR-09** The system shall validate the extracted FGPN against the predefined list of part numbers associated with the selected project.

**M02-FR-10** The system shall validate the extracted contact information against the predefined list of contact names.

**M02-FR-11** The system shall validate the extracted JIT customer against the predefined list of customers.

**M02-FR-12** The system shall validate the extracted development level against the predefined business reference for the project.

**M02-FR-13** The system shall compare the extracted unit price with the predefined unit price for the relevant FGPN and project. Any discrepancy shall display both the extracted value and the expected value side by side.

**M02-FR-14** The system shall display a validation status for each extracted field: Validated, Mismatch, Missing, or Not Applicable.

### M02.5 Functional Requirements - User Review and Correction

**M02-FR-15** The system shall display all extracted fields to the user for review after every extraction, regardless of whether validation issues were detected.

**M02-FR-16** The authorized launch user shall be able to modify any extracted field value before confirming the record.

**M02-FR-17** Any field value manually modified by the user shall be marked as Corrected by user in the stored record, retaining both the originally extracted value and the user-entered correction.

### M02.6 BP - Always Show Extracted Data for Review

**BP:** Even when no validation issues are detected, the system shall always present extracted data to the user before committing it to storage. PDF parsing is imperfect, especially on scanned or non-standard documents. A mandatory review step catches extraction errors before they propagate into simulations, stock calculations, and finance records.

### M02.7 BP - Reject Non-PDF Submissions

**BP:** The system shall refuse any uploaded file that is not a PDF. Files with other extensions shall be rejected at upload with a message stating that only PDF files are accepted.

### M02.8 Acceptance Criteria

**M02-AC-01** Given a valid Covers Purchase Order PDF, when a launch user uploads it, then the system extracts all available fields and presents them in a review screen within 30 seconds of upload completion.

**M02-AC-02** Given an uploaded file that is not a PDF, when the user submits it, then the system rejects it immediately with the message: Only PDF files are accepted.

**M02-AC-03** Given a PDF that does not match the expected Covers Purchase Order structure, when the user uploads it, then the system displays a rejection message and does not proceed to extraction.

**M02-AC-04** Given an extracted FGPN that does not match any entry in the project part number list, when the extraction review screen is displayed, then the FGPN field is highlighted with a Mismatch status showing the expected valid values.

**M02-AC-05** Given an extracted unit price that differs from the predefined unit price for that FGPN, when the review screen is displayed, then both prices are shown side by side with a discrepancy indicator.

**M02-AC-06** Given the user has corrected an extracted field value, when the record is saved, then the stored record contains the user-entered value, the original extracted value, and a Corrected by user flag.

**M02-AC-07** Given a mandatory field that could not be extracted, when the review screen is displayed, then that field is flagged as Missing and the system prevents confirmation until the user enters a value.

**M02-AC-08** Given a multi-line purchase order PDF with 3 FGPNs, when extraction completes, then 3 separate line items are presented each with their own FGPN, quantity, and unit price.

### M02.9 Role Access for This Module

| **Action**               | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ------------------------ | ------------- | -------------- | --------------- | ---------- | ------------- |
| Upload PO PDF            | No            | Yes (own)      | Yes (own)       | No         | No            |
| Review extracted data    | No            | Yes (own)      | Yes (own)       | No         | No            |
| Correct extracted fields | No            | Yes (own)      | Yes (own)       | No         | No            |
| Confirm and store        | No            | Yes (own)      | Yes (own)       | No         | No            |

## M03 - Purchase Order Storage, Versioning, and Comparison

### M03.1 Purpose

Maintain a complete, immutable history of all purchase order submissions including multiple versions of the same purchase order, and support side-by-side comparison between versions.

### M03.2 Functional Requirements - Storage

**M03-FR-01** The system shall store the confirmed extracted purchase order data after user review.

**M03-FR-02** The system shall store the original submitted PDF file linked to the extracted record.

**M03-FR-03** A purchase order record shall contain the fields in the table below where available.

| **#** | **Field**                     | **Notes**                                   |
| ----- | ----------------------------- | ------------------------------------------- |
| 1     | JIT Customer                  | NA                                          |
| 2     | Purchase Order Number         | NA                                          |
| 3     | Contact Name                  | NA                                          |
| 4     | Document Date                 | NA                                          |
| 5     | Delivery Week                 | Derived                                     |
| 6     | Car Model                     | NA                                          |
| 7     | Engineering Phase Level       | NA                                          |
| 8     | Part Number                   | NA                                          |
| 9     | Color Code                    | NA                                          |
| 10    | Finished Goods Part Number    | NA                                          |
| 11    | Description                   | NA                                          |
| 12    | Trim Code                     | NA                                          |
| 13    | Unit Price                    | NA                                          |
| 14    | Amount                        | Calculated: Unit Price x Remaining Quantity |
| 15    | Purchase Order Level          | NA                                          |
| 16    | Purchase Order Quantity       | NA                                          |
| 17    | Delivered Quantity            | NA                                          |
| 18    | Remaining Quantity to Deliver | Calculated: PO Qty minus Delivered Qty      |
| 19    | Pick-Up Date                  | NA                                          |
| 20    | Pick-Up Week                  | Derived                                     |

**M03-FR-04** For multi-line purchase orders, each line item shall be stored as an independent record linked to the same purchase order header.

### M03.3 Functional Requirements - Versioning

**M03-FR-05** If the same purchase order is resubmitted, the system shall store the new version as a separate record without deleting or overwriting the previous version.

**M03-FR-06** All versions of the same purchase order shall remain available for consultation at any time.

**M03-FR-07** Each version shall be assigned a sequential version number (V1, V2, V3, etc.) and a storage timestamp.

**M03-FR-08** Versions shall be linked by the purchase order number.

### M03.4 Functional Requirements - Version Comparison

**M03-FR-09** The system shall allow an authorized user to select any two versions of the same purchase order and initiate a comparison.

**M03-FR-10** The system shall display a field-by-field comparison showing for each field: value in version A, value in version B, and a change indicator (Changed / Unchanged / Added / Removed).

### M03.5 Calculated Fields

| **Field**                     | **Calculation Rule**                             |
| ----------------------------- | ------------------------------------------------ |
| Delivery Week                 | ISO week number derived from Delivery Date       |
| Pick-Up Week                  | ISO week number derived from Pick-Up Date        |
| Amount                        | Unit Price x Remaining Quantity to Deliver       |
| Remaining Quantity to Deliver | Purchase Order Quantity minus Delivered Quantity |

### M03.6 BP - Immutability of Stored Versions

**BP:** Once a version of a purchase order is stored, its content shall not be editable. If a correction is needed, a new version must be submitted. This preserves the integrity of the audit trail and prevents retroactive modification of business records.

### M03.7 Acceptance Criteria

**M03-AC-01** Given a purchase order V1 already stored, when the same purchase order is submitted again with a changed quantity, then V2 is stored as a new version and V1 remains accessible and unchanged.

**M03-AC-02** Given V1 and V2 exist for the same PO number, when the user initiates a comparison, then the system displays all fields side by side and marks each changed field with a Changed indicator.

**M03-AC-03** Given a stored purchase order version, when any user attempts to edit a field directly, then the system does not allow the edit and directs the user to submit a new version.

**M03-AC-04** Given a PO with quantity 100 and delivered quantity 40, when the system displays the PO record, then Remaining Quantity shows 60 and Amount is Unit Price x 60.

**M03-AC-05** Given a multi-line PO with 3 line items, when the user views the PO record, then all 3 line items are displayed each with its own FGPN, quantity, unit price, and calculated amount.

### M03.8 Role Access for This Module

| **Action**          | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| View PO records     | Read (all)    | Read (all)     | Own projects    | No         | No            |
| View PO versions    | Read (all)    | Read (all)     | Own projects    | No         | No            |
| Compare PO versions | No            | Yes (own)      | Yes (own)       | No         | No            |

## M04 - Purchase Order Status Tracking

### M04.1 Purpose

Track each purchase order through its production and delivery lifecycle using a defined set of statuses. Support partial production and partial delivery against a single purchase order.

### M04.2 Defined Statuses

| **Status**  | **Meaning**                                                         |
| ----------- | ------------------------------------------------------------------- |
| Unplanned   | Purchase order received but no production planned                   |
| In Progress | Production has started                                              |
| Done        | Production is complete                                              |
| Packaged    | Finished goods are packaged, awaiting delivery                      |
| Delivered   | Goods have been delivered to the customer and delivery is confirmed |

### M04.3 Functional Requirements

**M04-FR-01** The system shall track and display the current status of each purchase order.

**M04-FR-02** The system shall record the date and the user who performed each status change.

**M04-FR-03** The system shall support partial production and partial delivery. A purchase order may be produced and delivered in multiple parts, each tracked separately.

**M04-FR-04** The system shall keep the remaining quantity to deliver visible on each purchase order record until the purchase order reaches Delivered status with zero remaining quantity.

**M04-FR-05** The system shall update delivered quantity and remaining quantity after each partial or full delivery is recorded.

**M04-FR-06** The system shall enforce status transition rules. The allowed forward transitions are: Unplanned to In Progress to Done to Packaged to Delivered.

**M04-FR-07** Backward transitions shall only be permitted by the assigned Launch Engineer and shall require a written reason to be recorded before the transition is allowed. See Open Point OP-05.

### M04.4 BP - Status Transition Model

**BP:** Status transitions shall be enforced by the system, not left to manual convention. The system shall prevent a user from setting a purchase order to a status not reachable from its current state according to the defined transition rules. This prevents data integrity errors and ensures the status history is a reliable business record.

### M04.5 Acceptance Criteria

**M04-AC-01** Given a PO in Unplanned status, when the user attempts to set the status directly to Packaged, then the system rejects the transition and displays the allowed next status options.

**M04-AC-02** Given a PO in In Progress status, when the user moves it to Done, then the system records the transition with a timestamp and the user's name.

**M04-AC-03** Given a PO with quantity 200, when a partial delivery of 80 is recorded, then delivered quantity shows 80 and remaining quantity shows 120.

**M04-AC-04** Given a PO with remaining quantity 0 and a delivery confirmed, when the final delivery is recorded, then the system prompts or sets the status to Delivered.

**M04-AC-05** Given a backward transition attempt, when the user initiates it, then the system requires a written reason before accepting the transition. The reason is stored in the status history.

### M04.6 Role Access for This Module

| **Action**          | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| View PO status      | Read (all)    | Read (all)     | Own projects    | No         | No            |
| Update PO status    | No            | Yes (own)      | Yes (own)       | No         | No            |
| View status history | Read (all)    | Read (all)     | Own projects    | No         | No            |

## M05 - Launch Manufacturing Simulation

### M05.1 Purpose

Allow the Launch Engineer to simulate whether production can be launched for one or several purchase orders based on current warehouse stock and material requirements, and to assess future launch possibilities using planned incoming stock.

### M05.2 Functional Requirements - Standard Single PO Simulation

**M05-FR-01** The Launch Engineer shall be able to run a simulation to determine whether a given purchase order can be launched based on available material stock.

**M05-FR-02** The simulation shall use the following inputs.

| **Input**                                     | **Source**                                    |
| --------------------------------------------- | --------------------------------------------- |
| Warehouse stock                               | System stock records (M07)                    |
| Remaining usable WIP material                 | CutMan import (Excel or SQL)                  |
| Bill of Material                              | BOM records (M06)                             |
| Quantities already launched                   | System records                                |
| Quantities already entered into manufacturing | System records                                |
| Safety coefficient                            | Fixed at 2 (pending confirmation - see OP-09) |

**M05-FR-03** The system shall calculate total available material quantity as: Warehouse Stock plus Remaining Usable WIP Material.

**M05-FR-04** The system shall calculate material requirements as: BOM Usage x Safety Coefficient x PO Quantity.

**M05-FR-05** The system shall determine and display whether the purchase order can be fully launched.

**M05-FR-06** The system shall determine and display whether the purchase order can be partially launched when full launch is not possible, showing the maximum launchable quantity.

**M05-FR-07** The system shall display a missing-material list including: material part number, required quantity, available quantity, and shortfall quantity.

**M05-FR-08** The Launch Engineer shall be able to export the missing-material list.

### M05.3 Functional Requirements - Multiple PO Simulation

**M05-FR-09** The Launch Engineer shall be able to run a simulation across multiple purchase orders from the same project when they are received simultaneously.

**M05-FR-10** The simulation shall identify which purchase orders can be fully launched, partially launched, or not launched at all, given shared available stock.

**M05-FR-11** The simulation shall aim to maximize the number of purchase orders fully launched. Priority rules must be defined by the business. See Open Point OP-06.

**M05-FR-12** The simulation shall track remaining open quantities for purchase orders that could not be fully launched.

### M05.4 BP - Simulation Priority and Tie-Breaking

**BP:** When multiple purchase orders compete for the same shared stock, the system must apply an explicit, documented prioritization rule. Without this, the simulation result is ambiguous and non-reproducible. Typical rules include: earliest delivery date first, highest purchase order value first, or customer-defined priority class. The business must define this rule before the simulation logic is implemented. See Open Point OP-06.

### M05.5 Functional Requirements - Future Stock Simulation

**M05-FR-13** The system shall provide a separate future-stock simulation mode.

**M05-FR-14** The Launch Engineer shall be able to enter quantities of stock expected to arrive in the upcoming week, alongside their expected arrival dates.

**M05-FR-15** The simulation shall combine current real stock values with the entered planned quantities to calculate projected launch feasibility.

**M05-FR-16** This simulation shall not write to or update any stored stock values. It is strictly a planning tool.

**M05-FR-17** The system shall generate a draft document clearly marked as: Based on real stock and planned future stock - not confirmed.

**M05-FR-18** The draft document shall include the quantities of each material still required to complete the planned launch.

**M05-FR-19** The draft document shall be stored as part of the audit trail. See Open Point OP-12.

### M05.6 BP - Future Simulation Document Storage

**BP:** Although the future-stock simulation does not update any operational stock values, the draft document it produces represents a business planning decision and should be retained in the audit trail. If a launch decision is later made based on that simulation, the supporting document must be traceable. The document shall be stored with a clear label distinguishing it from confirmed launch documents.

### M05.7 Functional Requirements - Meeting Requirement

**M05-FR-20** Any launch operation shall be subject to a prior or concurrent meeting.

**M05-FR-21** A meeting minutes document shall be uploaded to the system for each launch operation, including any operation involving requesting goods quantities from the warehouse.

**M05-FR-22** The system shall not allow a launch operation to be finalized unless an associated meeting minutes document has been uploaded and linked to that operation.

### M05.8 Acceptance Criteria

**M05-AC-01** Given a PO requiring 100 units of material A and 50 of B, and stock showing 80 of A and 60 of B, when the simulation is run, then: Full launch: No; Partial launch: possible; Missing material: A required 100, available 80, shortfall 20.

**M05-AC-02** Given 3 purchase orders sharing the same stock pool, when the multi-PO simulation is run, then the result shows which POs can be fully launched, partially launched, and which cannot be launched at all.

**M05-AC-03** Given a future-stock simulation with planned incoming stock entered, when the simulation is run, then the system shows projected feasibility based on current plus planned stock and does not change any stored stock values.

**M05-AC-04** Given that a future-stock simulation is completed, when the user finishes, then a draft document is generated labelled Based on real and planned stock and is stored in the audit trail.

**M05-AC-05** Given a user who attempts to finalize a launch operation without uploading a meeting minutes document, when they click confirm, then the system blocks the operation with the message: A meeting minutes document must be uploaded before this launch can be finalized.

**M05-AC-06** Given a missing-material list generated by a simulation, when the user clicks export, then a file is downloaded containing material part number, required quantity, available quantity, and shortfall quantity for each missing material.

### M05.9 Role Access for This Module

| **Action**                   | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ---------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| Run single PO simulation     | No            | Yes (own)      | Yes (own)       | No         | No            |
| Run multi-PO simulation      | No            | Yes (own)      | Yes (own)       | No         | No            |
| Run future-stock simulation  | No            | Yes (own)      | Yes (own)       | No         | No            |
| Export missing material list | No            | Yes (own)      | Yes (own)       | No         | No            |
| Upload meeting minutes       | No            | Yes (own)      | Yes (own)       | No         | No            |

## M06 - Bill of Material and Material Requirements

### M06.1 Purpose

Define and maintain the Bill of Material data that drives material requirement calculations in the launch simulation. BOM data is loaded via Excel file upload and must be validated before use.

### M06.2 Functional Requirements - BOM Upload

**M06-FR-01** The system shall allow the Launch Engineer to upload a Bill of Material as an Excel file (.xlsx format).

**M06-FR-02** The system shall parse the uploaded Excel file and load the BOM data into the system.

**M06-FR-03** The system shall validate the structure of the uploaded Excel file against the expected BOM template. If the file does not match, the system shall reject the upload and display a clear error message identifying the problem.

**M06-FR-04** The expected BOM Excel structure shall include at minimum: FGPN, Material Part Number, Usage Quantity per unit of finished good. A separate BOM template specification shall be provided to the business.

**M06-FR-05** If a BOM already exists for a project and a new Excel file is uploaded, the system shall store the new version and retain the previous version with its upload date. The Launch Engineer shall confirm the replacement before it takes effect.

### M06.3 Functional Requirements - BOM Data and Calculations

**M06-FR-06** The Bill of Material shall define the material quantity required per unit of each Finished Goods Part Number.

**M06-FR-07** The system shall support a many-to-many relationship between FGPNs and material part numbers.

**M06-FR-08** A purchase order may contain several FGPNs. The material requirement calculation shall aggregate requirements across all FGPNs in the purchase order.

**M06-FR-09** Material requirements shall be calculated as: Required Material Quantity = BOM Usage Quantity x Safety Coefficient x PO Quantity. Safety Coefficient = 2 (pending confirmation - see OP-09).

### M06.4 BP - BOM Template Versioning

**BP:** Each BOM Excel file upload shall be timestamped and linked to the project it belongs to. If a simulation was run on a given date, it shall always be possible to identify which version of the BOM was used in that simulation. This is essential for audit and for understanding why two simulations run at different times may have produced different results.

### M06.5 Acceptance Criteria

**M06-AC-01** Given an Excel file matching the expected BOM template, when the Launch Engineer uploads it, then the system loads it successfully and displays a summary of loaded records.

**M06-AC-02** Given an Excel file that does not match the expected BOM template, when the user uploads it, then the system rejects it and displays an error message identifying the issue.

**M06-AC-03** Given an existing BOM for a project and a new Excel file uploaded, when the user confirms the replacement, then the new BOM is active and the old BOM is stored with its upload date and remains accessible.

**M06-AC-04** Given FGPN-X with BOM usage of 3 units of material A, safety coefficient of 2, and PO quantity of 10, when the simulation calculates requirements, then required quantity of material A = 3 x 2 x 10 = 60 units.

**M06-AC-05** Given two FGPNs that both require material A, when a PO containing both is simulated, then the system aggregates requirements correctly and shows the total required quantity of material A.

### M06.6 Role Access for This Module

| **Action**               | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ------------------------ | ------------- | -------------- | --------------- | ---------- | ------------- |
| Upload BOM Excel file    | No            | Yes (own)      | Yes (own)       | No         | No            |
| View BOM data            | No            | Yes (own)      | Yes (own)       | No         | No            |
| View BOM version history | No            | Yes (own)      | Yes (own)       | No         | No            |

## M07 - Stock Management

### M07.1 Purpose

Record, track, and update all material stock movements including reception from suppliers, work-in-progress transfers, transit stock, critical threshold monitoring, and stock history. WIP stock consumed in the cutting area is imported from the CutMan software.

### M07.2 Functional Requirements - Stock Reception

**M07-FR-01** The system shall allow warehouse users to search for a material part number using partial string matching on both the part number and the material description.

**M07-FR-02** The system shall display matching results as the user types, with results appearing within 2 seconds of 3 or more characters being entered.

**M07-FR-03** The system shall allow warehouse users to record received material quantities against a searched material part number.

**M07-FR-04** The system shall record the date and the username of each stock reception transaction.

**M07-FR-05** Warehouse users shall be able to correct a recorded reception entry within 24 hours of the original entry timestamp.

**M07-FR-06** After 24 hours from the original entry timestamp, the reception entry shall be locked and no longer modifiable by warehouse users.

**M07-FR-07** After the 24-hour lock, only the Launch Engineer assigned to the relevant project shall be able to modify a locked reception entry. Any modification shall require a written reason and shall be stored as a correction event in the stock history.

### M07.3 Functional Requirements - Stock Updates

**M07-FR-08** The system shall update stock values within 5 seconds of a reception entry being saved.

**M07-FR-09** The system shall update stock values within 5 seconds of a cutting-area consumption being recorded.

**M07-FR-10** The system shall update stock values within 5 seconds of a transit update being submitted.

**M07-FR-11** The system shall update stock values within 5 seconds of a signed warehouse-to-manufacturing delivery document being validated.

**M07-FR-12** The updated stock value shall be visible to all authorized users on the stock monitoring view within 5 seconds of the movement being recorded.

### M07.4 Functional Requirements - CutMan Integration (WIP Stock)

**M07-FR-13** The system shall allow the Launch Engineer to import WIP stock data from the CutMan software. Accepted formats are Excel file (.xlsx) or SQL script output.

**M07-FR-14** The system shall parse the imported CutMan data and update the WIP stock values accordingly.

**M07-FR-15** The system shall validate the imported file structure. If the file does not match the expected CutMan export format, the system shall reject it and display an error message.

**M07-FR-16** Each CutMan import event shall be recorded in the stock history with the import timestamp, the user who performed the import, and the quantities updated.

**M07-FR-17** The system shall allow warehouse users to manually record material rolls transferred to the cutting area as an alternative or complement to CutMan import.

### M07.5 Functional Requirements - Transit Stock

**M07-FR-18** The system shall allow the Launch Engineer to enter quantities of material in transit and their expected arrival dates.

**M07-FR-19** The system shall display Practical Stock, defined as confirmed on-hand warehouse stock excluding transit quantities.

**M07-FR-20** The system shall display Theoretical Stock, defined as Practical Stock plus expected transit quantities.

**M07-FR-21** The system shall clearly distinguish between Practical Stock and Theoretical Stock in all stock views.

### M07.6 Functional Requirements - Critical Thresholds

**M07-FR-22** The system shall allow the Launch Engineer to define a critical stock threshold value for each material part number.

**M07-FR-23** The stock monitoring view shall display a visible alert indicator for any material whose current Practical Stock is at or below its defined critical threshold.

**M07-FR-24** The threshold alert shall remain visible until the stock exceeds the threshold value.

### M07.7 Functional Requirements - Stock History

**M07-FR-25** The system shall maintain a complete history of all stock changes. Each entry shall include: material part number, movement type, quantity changed, resulting stock value, date and time, and the username of the person who performed the action.

**M07-FR-26** Stock history entries shall be immutable. No user shall be able to delete or modify a history entry.

**M07-FR-27** Only the Launch Engineer and Launch Manager shall be able to view the stock history.

### M07.8 BP - 24-Hour Correction Window

**BP:** The 24-hour correction window for warehouse users shall be enforced by comparing the current timestamp to the original entry timestamp, not by calendar day. An entry made at 23:00 is correctable until 23:00 the following day, not just until midnight.

### M07.9 BP - Correction Audit Trail

**BP:** When a Launch Engineer modifies a locked reception entry, the system shall store both the original value and the corrected value, along with the reason provided, the correction timestamp, and the Launch Engineer username. This correction event is part of the stock history and is immutable once saved. The original entry is never overwritten.

### M07.10 Acceptance Criteria

**M07-AC-01** Given a warehouse user types ALU in the material search field, when results are returned within 2 seconds, then all materials with part numbers or descriptions containing ALU are displayed.

**M07-AC-02** Given a reception entry saved at 10:00 on Monday, when a warehouse user attempts to correct it at 09:59 on Tuesday, then the correction is permitted. When they attempt at 10:01 on Tuesday, then the system displays: Entry locked - correction period has expired.

**M07-AC-03** Given a locked entry, when the Launch Engineer selects it for correction, then the system requires a written reason before accepting the new value. After saving, the history shows both the original and corrected value with the reason.

**M07-AC-04** Given stock of 100 units and a reception of 50 recorded, when the reception is saved, then the displayed stock value updates to 150 within 5 seconds.

**M07-AC-05** Given a CutMan Excel file uploaded by the Launch Engineer that matches the expected format, then the system parses it, updates WIP stock values, and records an import event in the stock history.

**M07-AC-06** Given a CutMan file that does not match the expected format, when the Launch Engineer uploads it, then the system rejects it and displays a message identifying the format issue.

**M07-AC-07** Given a critical threshold of 50 units defined for material X and current stock of 48 units, when the stock monitoring view is displayed, then material X shows a visible threshold alert indicator.

**M07-AC-08** Given a Warehouse Personnel account, when the user navigates to the stock history section, then the stock history is not visible or accessible.

### M07.11 Role Access for This Module

| **Action**                       | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| -------------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| Search material part numbers     | No            | Yes            | Yes             | Yes        | Yes           |
| Record stock reception           | No            | No             | No              | Yes        | Yes           |
| Correct entry (within 24h)       | No            | No             | No              | Yes        | No            |
| Correct locked entry (after 24h) | No            | Yes (own)      | Yes (own)       | No         | No            |
| Import CutMan data               | No            | Yes (own)      | Yes (own)       | No         | No            |
| Record WIP transfer manually     | No            | No             | No              | Yes        | No            |
| Enter transit stock              | No            | Yes (own)      | Yes (own)       | No         | No            |
| Define critical thresholds       | No            | Yes (own)      | Yes (own)       | No         | No            |
| View stock monitoring            | No            | Yes            | Yes             | Yes        | No            |
| View stock history               | No            | Yes (own)      | Yes (own)       | No         | No            |

## M08 - Warehouse-to-Manufacturing Delivery

### M08.1 Purpose

Manage the formal process of transferring goods from the warehouse to the manufacturing area, including delivery instruction creation, delivery code generation, document generation, signature recording, and the resulting stock update.

### M08.2 Functional Requirements - Delivery Preparation

**M08-FR-01** The Launch Engineer shall create a delivery instruction record specifying the goods to be transferred from the warehouse to manufacturing.

**M08-FR-02** The delivery instruction shall specify for each item: material part number, description, quantity of rolls or units to deliver, and required delivery time.

**M08-FR-03** The system shall not allow a delivery instruction to be created without an associated approved launch operation including uploaded meeting minutes.

### M08.3 Functional Requirements - Delivery Code

**M08-FR-04** After the delivery instruction is saved, the system shall generate a unique, time-limited delivery code.

**M08-FR-05** The delivery code shall be valid for a maximum of 48 hours from generation. After expiry, a new one must be generated. See Open Point OP-13.

**M08-FR-06** The Warehouse Team Leader shall enter the delivery code into the system to access the delivery instructions.

**M08-FR-07** Upon successful code entry, the system shall display the goods type, part number, and quantities to be delivered.

**M08-FR-08** Each delivery code shall be single-use. Once the Warehouse Team Leader has accessed the delivery details and generated the delivery document, the code shall be invalidated.

### M08.4 Functional Requirements - Delivery Document and Signature

**M08-FR-09** The Warehouse Team Leader shall generate the formal warehouse-to-manufacturing delivery document from the system.

**M08-FR-10** Before generating the document, the Warehouse Team Leader shall select the Manufacturing Receiver name from the predefined receiver list.

**M08-FR-11** The generated document shall display at minimum: delivery date, goods list with quantities, Warehouse Team Leader name, and Manufacturing Receiver name.

**M08-FR-12** The Manufacturing Receiver shall sign the physical delivery document upon receiving the goods.

**M08-FR-13** The Warehouse Team Leader shall upload the signed reception document (as a PDF scan) to the system.

**M08-FR-14** The system shall record the upload timestamp, the Warehouse Team Leader who uploaded, and the selected receiver name.

**M08-FR-15** The stock update shall only be applied after the signed document is uploaded and validated. See Open Point OP-10.

### M08.5 BP - Delivery Code Security

**BP:** The delivery code mechanism is a lightweight access control for warehouse floor use. To maintain security, the code shall be time-limited (48 hours) and single-use. The system shall log every code generation and code access event, including whether the access was successful or failed. Expired or already-used codes shall produce a clear message.

### M08.6 Acceptance Criteria

**M08-AC-01** Given an approved launch operation with meeting minutes uploaded, when the Launch Engineer creates a delivery instruction, then the system accepts it and generates a delivery code.

**M08-AC-02** Given no meeting minutes uploaded, when the Launch Engineer attempts to create a delivery instruction, then the system blocks the action with the message: A meeting minutes document must be uploaded before a delivery instruction can be created.

**M08-AC-03** Given a valid delivery code, when the Warehouse Team Leader enters it within 48 hours, then the delivery details are displayed correctly.

**M08-AC-04** Given an expired delivery code, when the Warehouse Team Leader enters it, then the system displays: This code has expired. Please contact the Launch Engineer to generate a new delivery instruction.

**M08-AC-05** Given a delivery code that has already been used, when someone enters it again, then the system displays: This code has already been used and does not show delivery details.

**M08-AC-06** Given a signed reception document uploaded and validated, then warehouse stock is reduced by the delivered quantities and a movement entry is recorded in the stock history.

**M08-AC-07** Given the delivery document is generated and a receiver name is selected from the list, then that name appears clearly on the generated document.

### M08.7 Role Access for This Module

| **Action**                  | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| --------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| Create delivery instruction | No            | Yes (own)      | Yes (own)       | No         | No            |
| Access delivery via code    | No            | No             | No              | Yes        | No            |
| Generate delivery document  | No            | No             | No              | Yes        | No            |
| Select receiver name        | No            | No             | No              | Yes        | No            |
| Upload signed reception doc | No            | No             | No              | Yes        | No            |
| Validate signed document    | No            | Yes (own)      | Yes (own)       | No         | No            |

## M09 - Customer Delivery

### M09.1 Purpose

Manage the delivery of finished goods to the customer, including delivery instruction generation, delivery method tracking, partial delivery tracking, and delivery confirmation.

### M09.2 Functional Requirements - Delivery Instruction

**M09-FR-01** The system shall allow the Launch Engineer to generate a customer delivery instruction document for the logistics department.

**M09-FR-02** The delivery instruction shall specify what must be delivered and how.

**M09-FR-03** The delivery instruction document shall include at minimum: Purchase Order Reference (always), Finished Goods Part Number (always), Quantity to deliver (always), Delivery method (always), Delivery date or planned delivery period (where available).

### M09.3 Functional Requirements - Delivery Method

**M09-FR-04** The delivery method shall be selected from the predefined delivery method list maintained by the System Administrator.

**M09-FR-05** The currently defined delivery methods are: Truck, DHL, Van. The final list requires business confirmation. See Open Point OP-08.

**M09-FR-06** Each delivery method shall have an associated transport cost defined in the system for finance tracking.

### M09.4 Functional Requirements - Delivery Confirmation

**M09-FR-07** A delivery record shall only be set to Delivered status after delivery confirmation has been received and submitted to the system by the Launch Engineer.

**M09-FR-08** The delivery confirmation shall include at minimum: confirmation date, method of confirmation, and the name of the person confirming.

**M09-FR-09** The delivery confirmation record shall be stored and included in audit documentation.

**M09-FR-10** The accepted forms of delivery confirmation require business confirmation. See Open Point OP-07.

### M09.5 Functional Requirements - Partial Deliveries

**M09-FR-11** A purchase order may be delivered in multiple shipments. Each shipment shall be recorded as a separate delivery record.

**M09-FR-12** Each partial delivery record shall contain: delivery date, delivery week, transport method, PO number, FGPN, delivered level, description, delivered quantity, and delivery value where required for finance tracking.

**M09-FR-13** The system shall update the delivered quantity and recalculate remaining quantity after each partial or full delivery.

**M09-FR-14** The system shall display cumulative delivered quantity and remaining quantity against the original PO quantity at all times.

### M09.6 BP - Delivery Not Confirmed Without Evidence

**BP:** A delivery shall never be marked as confirmed based on the Launch Engineer assumption alone. Confirmation must be an explicit system action triggered by received evidence. This ensures that the Delivered status and finance actuals are based on real events, maintaining the integrity of the forecast-versus-actual comparison in M10.

### M09.7 Acceptance Criteria

**M09-AC-01** Given a PO with quantity 300, when a partial delivery of 100 is recorded, then the system creates a delivery record for 100 units, updates delivered quantity to 100, and remaining quantity to 200.

**M09-AC-02** Given a delivery record exists, when the Launch Engineer attempts to set it to Delivered without recording a confirmation, then the system blocks the status change and requires confirmation details.

**M09-AC-03** Given a delivery method selected from the list, when the delivery instruction is generated, then the transport cost associated with that method is stored in the delivery record.

**M09-AC-04** Given three partial deliveries of 100, 150, and 50 against a PO of 300, when all three are recorded, then cumulative delivered quantity shows 300, remaining quantity shows 0, and the PO is eligible for Delivered status.

**M09-AC-05** Given a delivery record set to Delivered with confirmation recorded, when the user views the delivery, then the confirmation date, method, and confirming person name are all visible.

### M09.8 Role Access for This Module

| **Action**                    | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ----------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| Generate delivery instruction | No            | Yes (own)      | Yes (own)       | No         | No            |
| Record delivery confirmation  | No            | Yes (own)      | Yes (own)       | No         | No            |
| View delivery records         | Read (all)    | Read (all)     | Own projects    | No         | No            |

## M10 - Finance, Recovery, and Sales Forecasting

### M10.1 Purpose

Track the monetary value of purchase orders and deliveries, calculate period-based revenue, support sales forecasting, and enable comparison of forecasted versus actual sales.

### M10.2 Functional Requirements - Price Data

**M10-FR-01** Each FGPN shall have a defined unit price stored in the system.

**M10-FR-02** Each delivery method shall have a defined transport cost stored in the system.

**M10-FR-03** Price records per part number shall include: Part Number, FGPN, Description, Trim Style, and Unit Price.

**M10-FR-04** The Launch Engineer shall be able to enter ordered material prices.

**M10-FR-05** Every price record change shall be stored with its effective date, previous value, new value, and the username of the person who made the change.

### M10.3 Functional Requirements - Period-Based Revenue Calculation

**M10-FR-06** The system shall calculate total revenue generated within a user-defined period.

**M10-FR-07** Revenue shall be calculated as: sum of (Delivered Quantity x Unit Price) for all deliveries confirmed within the selected period, plus applicable transport costs.

**M10-FR-08** The system shall support period views for at minimum: current calendar month and next calendar month.

**M10-FR-09** The system shall clearly distinguish between revenue from fully delivered purchase orders and revenue from partially delivered purchase orders.

### M10.4 Functional Requirements - Sales Forecasting

**M10-FR-10** The system shall generate a sales forecast based on planned production and planned delivery data.

**M10-FR-11** The forecast shall be based on planned pick-up dates and planned quantities.

**M10-FR-12** The forecast shall be displayed in a period view consistent with the revenue calculation view.

### M10.5 Functional Requirements - Actual Sales Tracking

**M10-FR-13** The system shall record actual sales based on confirmed delivery records.

**M10-FR-14** Each actual sale record shall include: delivery date, FGPN, quantity delivered, unit price, and calculated delivery value.

**M10-FR-15** The system shall display a comparison between forecasted sales and actual sales, showing variance by period.

### M10.6 Functional Requirements - Invoice Documents

**M10-FR-16** The system shall allow authorized users to upload invoice documents (PDF) associated with specific delivery records.

**M10-FR-17** Stored invoices shall be retrievable by delivery record reference.

**M10-FR-18** The business must confirm whether invoices are mandatory for all deliveries or only where applicable. See Open Point OP-11.

### M10.7 BP - Price Change Traceability

**BP:** Unit prices may change over time. The system shall never overwrite a price record. Each change shall create a new record with its effective date, so that the value used in any historical calculation can always be reconstructed. When calculating amounts for past deliveries, the system shall use the price that was active on the delivery date.

### M10.8 Acceptance Criteria

**M10-AC-01** Given deliveries confirmed in June totalling 200 units of FGPN-X at 15.50 per unit, when the user views the current month revenue, then the displayed revenue is 3,100.00 plus transport costs.

**M10-AC-02** Given a forecasted pick-up of 500 units in July and actual delivery of 350 units confirmed in July, when the user views the July comparison, then Forecast: 500, Actual: 350, Variance: -150.

**M10-AC-03** Given a unit price changed from 15.50 to 16.00 on 1 July, when the system calculates revenue for a delivery confirmed on 28 June, then the price used is 15.50, not 16.00.

**M10-AC-04** Given an authorized user uploads an invoice PDF linked to a delivery record, when they navigate to that delivery record, then an accessible link to the invoice is displayed.

**M10-AC-05** Given the Launch Engineer enters a new ordered material price, when the record is saved, then the price history shows the previous value, the new value, the effective date, and the username.

### M10.9 Role Access for This Module

| **Action**                    | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ----------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| View finance dashboards       | Read (all)    | Read (all)     | Own projects    | No         | No            |
| Manage forecasts              | No            | Yes (own)      | Yes (own)       | No         | No            |
| Enter ordered material prices | No            | Yes (own)      | Yes (own)       | No         | No            |
| Upload invoice documents      | No            | Yes (own)      | Yes (own)       | No         | No            |
| View invoice documents        | No            | Yes (own)      | Yes (own)       | No         | No            |

## M11 - Dashboards and Monitoring

### M11.1 Purpose

Provide role-appropriate visual monitoring of key business data across projects, purchase orders, stock, deliveries, and finance. Dashboards shall surface exceptions and alerts prominently rather than requiring users to search for problems.

### M11.2 Functional Requirements - Plant Manager Dashboards

**M11-FR-01** The Plant Manager shall be able to access all dashboards across all projects.

**M11-FR-02** No create, edit, or delete controls shall be available to the Plant Manager in any dashboard view.

### M11.3 Functional Requirements - Launch Engineer Dashboards

**M11-FR-03** The Launch Engineer shall be able to access dashboards for assigned projects only.

**M11-FR-04** The dashboards shall include the panels in the table below.

| **Dashboard Panel**         | **Content**                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| Purchase Orders             | PO list with status, quantities, remaining quantity, delivery week     |
| Stock Status                | Current practical and theoretical stock per material, threshold alerts |
| Material Requirements       | Required vs. available stock for active simulations                    |
| Launch Planning             | Planned and confirmed launch operations with dates                     |
| Deliveries                  | Delivery records, confirmation status, pending confirmations           |
| Monthly Delivery Values     | Revenue by month, current and next month                               |
| Forecasted vs. Actual Sales | Side-by-side by period with variance                                   |
| Critical Thresholds         | Materials at or below threshold highlighted                            |

### M11.4 Functional Requirements - Delivery Monitoring View

**M11-FR-05** The system shall provide a delivery monitoring view showing all pending and confirmed deliveries with their status.

**M11-FR-06** Deliveries awaiting confirmation shall be displayed with a visible pending indicator.

### M11.5 Functional Requirements - Search and Filtering

**M11-FR-07** All dashboard panels shall support filtering by at minimum: project (where applicable), date range, and status.

**M11-FR-08** Material part number search shall support partial string matching on both part number and description fields. Results shall begin appearing after 3 characters are entered, within 2 seconds.

**M11-FR-09** Delivery search shall support filtering by: PO number, FGPN, delivery date range, and delivery status.

### M11.6 BP - Exception-Based Dashboard Design

**BP:** Dashboards shall be designed to surface problems, not just data. Items requiring immediate attention (stock below threshold, deliveries overdue for confirmation, purchase orders with missing materials, launch operations without meeting minutes) shall be prominently displayed at the top of the relevant panel with a clear visual indicator. Users shall be able to see what requires action without reading through all records.

### M11.7 Acceptance Criteria

**M11-AC-01** Given a Launch Engineer assigned to projects A and B, when they open the dashboard, then only data from projects A and B is visible.

**M11-AC-02** Given a Plant Manager account, when the user opens the dashboard, then data from all projects is visible and no edit controls are present on any panel.

**M11-AC-03** Given a material whose stock is below its critical threshold, when the stock status panel is displayed, then that material appears at the top of the panel with a visible alert indicator.

**M11-AC-04** Given a delivery awaiting confirmation, when the delivery monitoring view is displayed, then that delivery shows a pending indicator.

**M11-AC-05** Given the user types ALU-03 in the material search field, when results are returned within 2 seconds, then all matching part numbers and descriptions are shown.

**M11-AC-06** Given the user applies a filter for status Unplanned, when the filter is applied, then only POs with Unplanned status are displayed.

### M11.8 Role Access for This Module

| **Action**                  | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| --------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| View all-project dashboards | Read          | Read           | No              | No         | No            |
| View own-project dashboards | NA            | Yes            | Yes             | No         | No            |
| View delivery monitoring    | Read          | Read           | Yes (own)       | No         | No            |
| View stock monitoring       | No            | Yes            | Yes             | Yes        | No            |

## M12 - Audit and Traceability

### M12.1 Purpose

Maintain a complete, tamper-evident audit trail of all significant system operations, decisions, documents, and status changes throughout the project lifecycle.

### M12.2 Functional Requirements - Audit Document Generation

**M12-FR-01** The system shall allow the generation of a project audit document covering the full lifecycle of a selected project.

**M12-FR-02** The audit document shall include the content in the table below where available.

| **#** | **Content**                                                    |
| ----- | -------------------------------------------------------------- |
| 1     | Purchase order PDFs and all stored versions                    |
| 2     | Purchase order statuses and complete status transition history |
| 3     | Purchase order corrections (original and corrected values)     |
| 4     | Purchase order version comparison summaries                    |
| 5     | Project tracking information                                   |
| 6     | Launch decisions with dates and responsible users              |
| 7     | Meeting minutes documents                                      |
| 8     | Manufacturing launch operations                                |
| 9     | Quantities requested from warehouse per operation              |
| 10    | Warehouse-to-manufacturing delivery documents                  |
| 11    | Signed reception documents                                     |
| 12    | Customer delivery documents and confirmation records           |
| 13    | Financial recovery and forecast information                    |
| 14    | Relevant stock movements                                       |
| 15    | BOM upload history and versions used per simulation            |
| 16    | CutMan import events                                           |

### M12.3 Functional Requirements - Traceability Records

**M12-FR-03** The system shall maintain traceability records for all the following events.

| **#** | **Traceability Event**                                         |
| ----- | -------------------------------------------------------------- |
| 1     | Stock changes (all movement types)                             |
| 2     | Purchase order versions submitted                              |
| 3     | Purchase order status changes (including backward transitions) |
| 4     | Launch simulations run (including inputs used)                 |
| 5     | Launch decisions made                                          |
| 6     | Meeting minutes uploaded                                       |
| 7     | Warehouse-to-manufacturing deliveries                          |
| 8     | Customer deliveries and confirmations                          |
| 9     | Signed documents uploaded                                      |
| 10    | Material price records and changes                             |
| 11    | Delivery and invoice records                                   |
| 12    | BOM uploads and replacements                                   |
| 13    | CutMan import events                                           |
| 14    | User login and access events                                   |

### M12.4 BP - Audit Record Immutability

**BP:** Audit and traceability records shall be immutable once created. No user, regardless of role (including System Administrator), shall be able to delete, overwrite, or modify an audit record. If a correction is made to business data, both the original record and the correction are stored as separate, immutable entries. This is a system constraint enforced at the data layer, not a configurable option.

### M12.5 BP - Document Signer Identification

**BP:** For every signed document uploaded to the system, the uploader shall select the signer name from a predefined list before the upload is accepted. Both the signer name and the uploader username shall be stored in the document record. This ensures every signed document has an identified signatory, supporting both legal and audit requirements.

### M12.6 Acceptance Criteria

**M12-AC-01** Given a project with at least one PO, one launch operation, and one delivery, when the Launch Engineer generates the audit document, then the document contains the PO PDF, the launch decision record, the meeting minutes, the delivery document, and the related stock movements.

**M12-AC-02** Given any audit or traceability record, when a user (including System Administrator) attempts to delete or overwrite it, then the action is rejected and an error is displayed.

**M12-AC-03** Given a warehouse delivery where stock was updated after the signed document upload, when the auditor views the stock history, then the stock movement entry is linked to the specific delivery document and shows the upload timestamp and uploader.

**M12-AC-04** Given an uploaded signed document, when the record is viewed, then both the uploader username and the selected signer name are clearly displayed.

**M12-AC-05** Given a backward status transition with a recorded reason, when the status history is viewed in the audit document, then the transition, the reason, the timestamp, and the user who performed it are all present.

### M12.7 Role Access for This Module

| **Action**                | **Plant Mgr** | **Launch Mgr** | **Launch Eng.** | **Wh. TL** | **Wh. Pers.** |
| ------------------------- | ------------- | -------------- | --------------- | ---------- | ------------- |
| Generate audit document   | No            | Yes (own)      | Yes (own)       | No         | No            |
| View audit document       | Read (all)    | Read (all)     | Own projects    | No         | No            |
| View traceability records | Read (all)    | Read (all)     | Own projects    | No         | No            |

# 5\. Non-Functional Requirements

## NFR-01 - Accuracy

The system shall extract all mandatory purchase order fields correctly from a valid, machine-readable Covers Purchase Order PDF. Extraction accuracy shall be validated during acceptance testing against a defined set of test PO documents agreed upon with the business.

The system shall accurately identify all field-level changes when comparing two versions of the same purchase order.

The system shall calculate material requirements as BOM Usage x Safety Coefficient x PO Quantity, with no rounding errors on values up to 4 decimal places.

The system shall produce period-based revenue figures that match manual recalculation using the same delivery records and prices, with zero variance.

## NFR-02 - Data Integrity and Traceability

The system shall maintain a complete, unbroken historical record of all stock changes, purchase order versions, price changes, delivery documents, invoice documents, meeting minutes, launch decisions, and signed documents.

No audit or traceability record shall be deletable, overwritable, or modifiable by any user or system process.

## NFR-03 - Access Control

The system shall enforce role-based access control as defined in Section 3 and the per-module access tables for every system action.

A user shall not be able to access, view, or modify data from a project they are not assigned to, regardless of their role level.

The Plant Manager shall have no create, update, or delete capability in any module.

Access control shall be enforced server-side. Removing a UI element shall not be the sole control. Unauthorized API or direct requests shall be rejected.

## NFR-04 - Data Protection

All data transmitted between user and system shall be encrypted in transit using TLS 1.2 or higher.

All data stored by the system shall be encrypted at rest.

Passwords shall be stored using a cryptographic hashing algorithm with salting (e.g., bcrypt or equivalent). Plain-text passwords shall never be stored.

User sessions shall expire after 60 minutes of inactivity. The inactivity timeout shall be configurable by the System Administrator.

## NFR-05 - Response Time for Stock Updates

Stock values shall be updated and reflected in the stock monitoring view within 5 seconds of a triggering event (reception, transit update, cutting consumption, or delivery confirmation).

If a stock update cannot be completed within 5 seconds due to a system error, the system shall display an error message and prevent the user from believing the update was successful.

## NFR-06 - Search Response Time

Material part number search results shall begin appearing within 2 seconds of the user entering at least 3 characters.

Delivery search results shall be returned within 3 seconds of a filter being applied.

Dashboard panel data shall load within 5 seconds of the user navigating to the dashboard.

## NFR-07 - Maintainability of Reference Data

All predefined reference lists shall be maintainable by the System Administrator through the system interface, without requiring software changes or developer intervention.

## NFR-08 - Concurrent Users

The system shall support at least \[number to be defined by business\] simultaneous active users without degradation of response times beyond the limits defined in NFR-05 and NFR-06.

When two users attempt to modify the same record simultaneously, the system shall apply an optimistic locking strategy: the first save succeeds; the second user is notified that the record was modified since they last loaded it and must reload before saving.

# 6\. Data Rules and Constraints

| **Field**                                  | **Rule**                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Purchase Order Number                      | Exactly 10 characters                                                                        |
| Part Number                                | 7 characters (in PO document structure)                                                      |
| Color Code                                 | Exactly 4 characters                                                                         |
| Finished Goods Part Number                 | Validated against project part number list; format pending business confirmation (see OP-01) |
| Purchase Order Level                       | Maximum 6 characters                                                                         |
| Unit Price                                 | Numeric; up to 4 decimal places                                                              |
| Delivery Description                       | Maximum 50 characters                                                                        |
| Material Description                       | Maximum 50 characters                                                                        |
| Material Part Number                       | Maximum 10 characters                                                                        |
| Uploaded file (PO)                         | PDF format only; maximum file size to be defined by business                                 |
| Uploaded file (BOM)                        | Excel (.xlsx) format only                                                                    |
| Uploaded file (CutMan)                     | Excel (.xlsx) or SQL script format                                                           |
| Uploaded file (signed documents, invoices) | PDF format only                                                                              |

## Material Reference Data

Material Types: Roll, Component, Thread

Material Statuses: Active, Inactive

# 7\. Open Points Requiring Business Confirmation

All open points must be resolved and signed off by the identified business owner before requirements are finalized and development begins on the affected module.

### OP-01 - Modules: M02, M03

**Question:** The source material states that an FGPN is 12 characters long but also shows the structure XXXXXX-XXXX-000. If separators are included, the structure is 15 characters; if excluded, it is 12. Which definition is authoritative?

**Business Owner:** Launch Manager / Launch Engineer

**Decision Needed:** Confirm the exact character length and whether separator characters are counted. Provide a validated real FGPN example.

**Impact if Unresolved:** The validation rule in M02 cannot be implemented. Incorrect validation will either reject valid FGPNs or accept invalid ones, causing downstream data quality errors.

### OP-02 - Modules: All

**Question:** The source material sometimes groups Launch Manager and Launch Engineer as having identical permissions and sometimes distinguishes them. The current SRS treats the Launch Manager as having read access to all projects and write access only on assigned projects. Is this correct?

**Business Owner:** Plant Manager / Department Head

**Decision Needed:** Define the exact permission differences. Confirm whether a Launch Manager can modify data on a project not assigned to them.

**Impact if Unresolved:** The access control model in M00 and all module permission tables cannot be finalized. Incorrect permissions risk unauthorized data modification or blocked legitimate access.

### OP-03 - Modules: M01, M11, M12

**Question:** One source document grants the Plant Manager read-only monitoring access to all modules. Another restricts system access entirely to Launch Manager and Launch Engineer. Which is authoritative?

**Business Owner:** Plant Manager / IT Security

**Decision Needed:** State definitively whether the Plant Manager has system access. If yes, define the exact scope.

**Impact if Unresolved:** The Plant Manager role cannot be configured in M00. Incorrect implementation risks inappropriate access or blocked visibility.

### OP-04 - Modules: M07

**Question:** The source material references both Warehouse Team Leader and Warehouse Personnel as separate actors. Are both distinct roles in the system, or do only Warehouse Team Leaders use the system?

**Business Owner:** Warehouse Manager / Operations Manager

**Decision Needed:** Confirm whether Warehouse Personnel have separate user accounts with a distinct role, or whether only the Warehouse Team Leader uses the system.

**Impact if Unresolved:** The M00 user setup and M07 access control cannot be finalized.

### OP-05 - Modules: M04

**Question:** The defined forward status flow is Unplanned to In Progress to Done to Packaged to Delivered. Are backward transitions ever allowed (for example from Done back to In Progress due to a quality issue)? If yes, under what conditions and by which role?

**Business Owner:** Launch Manager / Launch Engineer

**Decision Needed:** Confirm whether backward transitions are permitted. If yes, define which transitions are allowed, under what conditions, and whether a reason is required.

**Impact if Unresolved:** The status transition logic in M04 cannot be fully implemented. Forward-only transitions may block legitimate operational needs.

### OP-06 - Modules: M05

**Question:** When multiple purchase orders from the same project compete for shared stock and cannot all be fully launched, the system must prioritize which POs are satisfied first. No prioritization rule is currently defined.

**Business Owner:** Launch Manager / Launch Engineer

**Decision Needed:** Define the prioritization rule. Options include: earliest delivery date first, highest PO value first, customer priority class, manual selection, or other.

**Impact if Unresolved:** The multi-PO simulation in M05 cannot produce a deterministic result. Two engineers running the same simulation may get different outcomes.

### OP-07 - Modules: M09

**Question:** The system requires delivery confirmation before marking a delivery as Delivered. What forms of confirmation are accepted? Options may include: upload of a signed delivery receipt (PDF), a confirmation flag entered by the Launch Engineer, an email record, or other.

**Business Owner:** Launch Manager / Logistics

**Decision Needed:** Define what constitutes valid delivery confirmation and what evidence must be uploaded or recorded.

**Impact if Unresolved:** The confirmation workflow in M09 cannot be implemented. Delivered status may be applied inconsistently, affecting finance actuals and audit completeness.

### OP-08 - Modules: M09

**Question:** The source defines three delivery methods: Truck, DHL, Van. Is this list final?

**Business Owner:** Logistics / Launch Manager

**Decision Needed:** Confirm whether Truck, DHL, and Van are the complete and final list, or whether additional methods exist or may be added.

**Impact if Unresolved:** The reference list in M00 cannot be finalized. Missing methods will produce incorrect delivery documents and affect finance cost calculations.

### OP-09 - Modules: M05, M06

**Question:** The source states that material requirements are calculated by multiplying BOM usage by 2 (safety coefficient). Does this coefficient of 2 apply to all material requirement calculations in all scenarios, or only in a specific described case?

**Business Owner:** Launch Engineer / Quality / Production

**Decision Needed:** Confirm whether the coefficient of 2 applies universally to all BOM-based calculations, or whether different coefficients apply in different scenarios.

**Impact if Unresolved:** The calculation formula in M06 and M05 is incomplete. An incorrect coefficient will cause systematically under- or over-estimated material requirements.

### OP-10 - Modules: M08

**Question:** After the Warehouse Team Leader uploads a signed reception document, who validates it before the stock update is applied? Is it the Launch Engineer, the Launch Manager, or is the upload itself the validation event?

**Business Owner:** Launch Manager / Warehouse Manager

**Decision Needed:** Define the validation step: who performs it, through what action in the system, and within what time limit.

**Impact if Unresolved:** The stock update trigger in M08 cannot be implemented correctly. Stock could be updated based on an incorrectly uploaded or invalid document.

### OP-11 - Modules: M10

**Question:** Are invoice documents required for all customer deliveries, or only for specific cases (for example above a certain value, for certain customers, or for certain delivery methods)?

**Business Owner:** Finance / Launch Manager

**Decision Needed:** Define whether invoice upload is mandatory for all deliveries or only where applicable. If conditional, define the conditions.

**Impact if Unresolved:** The M10 invoice requirement cannot be enforced. If invoices are mandatory but not enforced, the finance audit trail will be incomplete.

### OP-12 - Modules: M05

**Question:** The source states that the future-stock simulation does not update any stored values, but also states that a draft document is generated. Must this draft document be stored in the system as part of the audit trail, or is it generated only for immediate use?

**Business Owner:** Launch Manager / Audit / Finance

**Decision Needed:** Confirm whether the draft document must be persisted in the system. If yes, confirm for how long and whether it is linked to the project audit document.

**Impact if Unresolved:** If the document is not stored and an audit requires evidence of the planning basis for a launch decision, the supporting document will not be available.

### OP-13 - Modules: M08

**Question:** The SRS proposes a 48-hour validity window for warehouse delivery codes. Is this acceptable to the business, or should the window be shorter (for example same working day) or longer?

**Business Owner:** Warehouse Manager / Launch Manager

**Decision Needed:** Define the maximum validity period for a delivery code from the time it is generated.

**Impact if Unresolved:** An overly long window is a minor security risk. An overly short window may cause operational problems if a delivery is delayed.