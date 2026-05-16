import { createSlice } from "@reduxjs/toolkit";


const loadStoredUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedUser = window.localStorage.getItem("xenonAuthUser");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const storedUser = loadStoredUser();


//centralized state management for authentication related data using redux
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedUser,
    // Always start as loading=true so Protected waits for session
    // validation (handleGetMe) before rendering the dashboard.
    // Without this, users with a stale localStorage entry but expired
    // cookie would see an empty dashboard before being kicked to login.
    loading: true,
    error: null,
  },
  //reducer => pure function that update state based on action
  //state => current state of auth slice(user,loading ,error)
  //action => insturction sent to redux to update state
  //payload => data sent with action to update state(actual data you want to store)
  
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload; //update user state with payload data
    },
    //state.loading => accessing loading value from state
    setLoading: (state, action) => {
      state.loading = action.payload; //update loading state with payload data
    },

    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});


export const { setUser , setLoading , setError} = authSlice.actions 

export default authSlice.reducer