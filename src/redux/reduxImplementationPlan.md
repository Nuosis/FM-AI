# Redux Implementation for React Frontend: Step-by-Step Guide

You are tasked with integrating Redux into a React frontend project located in the `frontend` folder. The backend, located in the `backend` folder, is built with Python, with tested CRUD operations already functional. 

Your goal is to implement a Redux store and a slice for managing organizations, starting with basic functionality and gradually introducing advanced features. Do this hand in hand with the organizationComponentFeatrues document. Our goal is to move in small chuncks adding features gradually and ensuring functionality before attending the next step. 

Follow these steps to ensure a clear and systematic implementation.

---

## Step 1: Install and Set Up Redux Done
1. Install Redux Toolkit and React-Redux for efficient state management.
2. Create a `redux` directory in the `frontend/src` folder:
   - Add a `store.js` file for configuring the Redux store.
   - Create a `slices` subdirectory for defining individual slices.

---

## Step 2: Configure the Redux Store DONE
1. Configure the Redux store by importing necessary reducers.
2. Ensure the store includes the slice for managing organizations.

---

## Step 3: Create the `organizationSlice` DONE
1. Review the existing `Organization` component to understand current data flow. This component will be replaced eventually but serves as a reference for functionality.
2. Refer to the `organizationComponentFeatures` document for insight into future goals for the component.
3. Create CRUD reducers for:
   - Fetching, adding, updating, and deleting organizations.
4. Include state management reducers:
   - `setLoading` for async operations.
   - `setError` for capturing errors.
   - `setRefresh` for method to reload from server (fetch).
5. Add functionality to track and hold modifications until the `update` action is called.

---

## Step 4: Optimize State Management DONE
1. Add utility reducers to enhance state functionality:
   - `selectOrganization`: Track the currently selected organization. DONE
   - `searchOrganizations`: Filter records based on a search query. DONE
   - `sortOrganizations`: Sort organizations by specified criteria. DONE
2. Extend the `Organization` component to: 
   - Include a search bar. DONE
   - add high level logging (calls and responses + errors) and detailed logging (exposed when verboseLog is true). Logs should write to app.frontend.log
   - clear log on app mount 
3. Integrate these new reducers into the `Organization` component and confirm functionality. Add logging to the component. Make sure the width is adjusted as in Organization when logs are rendering. DONE

---

## Step 5a: Enhance User Interaction (Editing) DONE
1. Add reducers for user interaction:
   - `editMode`: Toggle between view and edit modes.
   - `setError` and `clearError`: Manage errors.
   - `setNotification` and `clearNotification`: Handle UI notifications.
2. Update the `Organization` component to include enhanced editing and creation forms, aligned with the outlined plan (outlined in organizationComponentFeatures).
3. Wire these reducers into the component and verify functionality.

---

## Step 5b: Enhance User Interaction (Validation) MIGHT BE DONE
1. Implement validation reducers:
   - `setValidationErrors`: Capture field-specific validation errors.
   - `validateEntireForm`: Run comprehensive form validation.
2. Integrate these reducers into the `Organization` component and test functionality.

---

REDUCERS
1. Implement validation reducers:
   - `setValidationErrors`: Capture field-specific validation errors.
   - `validateEntireForm`: Run comprehensive form validation.
2. Add reducers for user interaction:
   - `editMode`: Toggle between view and edit modes.
   - `setError` and `clearError`: Manage errors.
   - `setNotification` and `clearNotification`: Handle UI notifications.
3. Add utility reducers to enhance state functionality:
   - `selectOrganization`: Track the currently selected organization.
   - `searchOrganizations`: Filter records based on a search query.
   - `sortOrganizations`: Sort organizations by specified criteria.

## Step 5c: Enhance User Interaction (Pagination)
1. Add pagination-related reducers:
   - `setCurrentPage`: Track the current page.
   - `usePagination`: Enable paginated data views.
2. Update the `Organization` component to:
   - Display pagination only when records exceed the default limit (e.g., 10).
   - Allow users to adjust the row limit for pagination (e.g., 25 rows per page).
   - Hide pagination when the total record count is below the current limit.
3. Ensure the component’s pagination functionality integrates seamlessly with the new reducers.

---

## Outcome
By following these steps, you will:
- Build a Redux store and slice that effectively manages organizations.
- Gradually enhance the `Organization` component with state optimization and UI interaction improvements.
- Introduce advanced functionality like search, sorting, editing, validation, and pagination.

This systematic approach ensures a clear, incremental implementation of Redux that improves the application’s usability and maintainability.


PROMPT:

I realized the infromation in ./backend/app/services/db/tables/organization.json was not accurate and as a result the way the data needs to be sent and received is incorrect. I have updated this. I have also updated the organizationComponentFeatures.txt to now properly reference the Database Layouts to use. I also updated the infrastructure needed  to more acrately reflect the location of the field and data we need.

review Organzationservice to ensure it is routing this information correctly.

RECEIVING DATA: Expect the data to be sent to the front end in the format provided in the json if fetch is from dapiOrganization.

SENDING DATA: To send data, the system should use that table's service where the field lives. For example, if the user adds an email, the service to use should be the email service - since it is related data. However the _fkID should be set to the primary ID of the Organization we are working in (so they remain related). Second we do not wrap the sent data in fieldData the filemaker_service handles this.

Here are the required changes to correct the planning mistakes:

Organization Service Updates: DONE
# Update get_organization() to use dapiOrganization layout
def get_organization(self, org_id: str):
    try:
        with FileMakerService(self.registry, self.database_identifier) as fm:
            response = fm.get_records(
                "dapiOrganization",  
                params={"__ID": org_id}
            )
            data = response.get("response", {}).get("data", [])
            return data[0] if data else None
    except FileMakerServiceError as e:
        raise OrganizationServiceError(f"Failed to get organization {org_id}: {str(e)}")

# Update member-related methods to use correct field names
def get_organization_members(self, org_id: str):
    try:
        with FileMakerService(self.registry, self.database_identifier) as fm:
            members_response = fm.get_records(
                "dapiParty",
                params={"_orgID": org_id}  # Changed from organizationId
            )
            # ... rest of method


Data Routing Changes: DONE
Remove direct manipulation of related data (email, phone, address) from OrganizationService
Add methods to coordinate with other services:
def add_organization_email(self, org_id: str, email_data: Dict):
    """Coordinate email addition through email service"""
    email_data["_fkID"] = org_id  # Set organization relationship
    return self.email_service.create_email(email_data)

def add_organization_phone(self, org_id: str, phone_data: Dict):
    """Coordinate phone addition through phone service"""
    phone_data["_fkID"] = org_id  # Set organization relationship
    return self.phone_service.create_phone(phone_data)

def add_organization_address(self, org_id: str, address_data: Dict):
    """Coordinate address addition through address service"""
    address_data["_fkID"] = org_id  # Set organization relationship
    return self.address_service.create_address(address_data)

    
Frontend Updates Needed:
Update Redux actions to handle portal data structure
Modify organization slice to properly parse dapiOrganization response
Update components to use proper field names (_fkID, _orgID)
API Route Updates:
Update routes to use proper service methods for related data
Ensure proper error handling for portal data operations
Testing Requirements:
Update test cases to verify portal data handling
Add tests for related data operations through proper services
Verify proper _fkID relationships are maintained
