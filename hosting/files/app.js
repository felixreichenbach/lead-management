// Retrieve App ID from URL
const hostname = window.location.hostname;
const res = hostname.split(".");

const appConfig = {
  id: res[0], // Set Realm App ID here.
  timeout: 10000, // timeout in number of milliseconds
};

const realmApp = new Realm.App(appConfig);

async function insertContacts(contactString) {
  try {
    const contacts = JSON.parse(contactString);
    contacts.userID = realmApp.currentUser.id;
    contacts.metadata.pivot.comlinkedinsalessearchListPivotResponse = contacts.metadata.pivot['com.linkedin.sales.search.ListPivotResponse'];
    delete contacts.metadata.pivot['com.linkedin.sales.search.ListPivotResponse'];
    console.log(JSON.stringify(contacts));
    const mongo = realmApp.currentUser.mongoClient("mongodb-atlas");
    const mongoCollection = mongo.db("contacts").collection("import");
    const insertOneResult = await mongoCollection.insertOne(contacts);
    return (insertOneResult);
  } catch (e) {
    throw (e)
  } finally {
  }
}


async function loginEmailPassword(email, password) {
  // Create an anonymous credential
  const credentials = Realm.Credentials.emailPassword(email, password);
  try {
    // Authenticate the user
    const user = await realmApp.logIn(credentials);
    console.log(JSON.stringify(user))
    // `App.currentUser` updates to match the logged in user
    //assert(user.id === app.currentUser.id)
    return user
  } catch (err) {
    return err
  }
}

// Vue.js Components

const RootComponent = {
  data() {
    if (realmApp.currentUser) {
      return {
        isLoggedIn: realmApp.currentUser.isLoggedIn
      }
    } else {
      return { isLoggedIn: false }
    }
  },
  methods: {
    async login() {
      this.isLoggedIn = true
    }
  }
}

const app = Vue.createApp(RootComponent);


app.component('loginForm', {
  data() {
    return {
      email: null,
      password: null,
      error: null
    }
  },
  props: ['isLoggedIn'],
  methods: {
    handleSubmit() {
      if (this.email && this.password) {
        loginEmailPassword(this.email, this.password).then(result => {
          console.log(JSON.stringify(result))
          if (!result.error) {
            console.log(result)
            this.$emit('login');
          } else {
            console.log("loginerror")
            this.error = result.error;
          }
        })

      } else {
        this.error = "Form Incomplete";
      }
    }
  },
  template: `
    <form @submit.prevent="handleSubmit">
        <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="email" v-model="email" placeholder="Email Address" autocomplete="username" class="form-control">
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" v-model="password" placeholder="Password" autocomplete="current-password" class="form-control">
        </div>
        <p id="loginError" class="text-danger text-center">{{ error }}</p>
        <div class="text-right">
        <button id="loginButton" type="submit" class="btn btn-primary">Sign in</button>
        </div>
    </form>`
})


app.component('profile', {
  data() {
    return { name: realmApp.currentUser.profile.email }
  },
  methods: {
    logout() {
      realmApp.currentUser.logOut().then(result => {
        this.$root.isLoggedIn = false
      })

    }
  },
  template: `
    <p>User: {{ name }}</p>
    <div class="text-right">
    <button v-on:click="logout" class="btn btn-primary">Logout</button>
    </div>`
})


app.component('inputarea', {
  data() {
    return {
      inputArea: null,
      error: null,
      success: null
    }
  },
  methods: {
    async handleInsert() {
      console.log(this.inputArea);
      try {
        const result = await insertContacts(this.inputArea);
        this.error = "";
        console.log(result);
        this.success = result;
        this.error = "";
        this.inputArea = "";
      } catch (e) {
        console.log(e);
        this.success = "";
        this.error = "Please Provide Valid JSON Structure!";
      }
    }
  },
  template: `
    <div class="container mt-3">
    <h4 class="text-center">"SalesNav" Import</h4>
    <form @submit.prevent="handleInsert">
      <div class="form-group">
        <label for="inputArea"></label>
        <textarea name="inputArea" id="inputArea" v-model="inputArea" rows="3" style="min-width: 100%"></textarea>
      </div>
      <p id="insertError" class="text-danger text-center">{{ error }}</p>
      <p id="insertSuccess" class=" text-success text-center">{{ success }}</p>
      <div class="text-right">
        <button id="insertButton" type="submit" class="btn btn-primary">Insert</button>
      </div>
    </form>
    </div>`
})

app.component('csvexport', {
  data() {
    return {
      selection: "",
      items: [
        {
          id: 1,
          name: "Choose Item"
        }
      ]
    }
  },
  methods: {
    async exporttocsv() {
      console.log("csvexport");
      try {
        const mongo = realmApp.currentUser.mongoClient("mongodb-atlas");
        const mongoCollection = mongo.db("contacts").collection("contacts");
        const insertOneResult = await mongoCollection.find({List:this.selection});
        console.log("result: "+insertOneResult);
        tocsv(insertOneResult);
        return (insertOneResult);
      } catch (e) {
        throw (e)
      } finally {
      }
    },
    onChange() {
      console.log(this.selection);
    },
    async loadList() {
      var distinctLists
      let lists = [];
      console.log("load list");
      this.items = []
      try {
        const mongo = realmApp.currentUser.mongoClient("mongodb-atlas");
        const mongoCollection = mongo.db("contacts").collection("contacts");
        distinctLists = await mongoCollection.aggregate(
          [
            {
              '$group': {
                '_id': null, 
                'lists': {
                  '$addToSet': '$List'
                }
              }
            }
          ]);
      } catch (e) {
        throw (e)
      } finally {
      }
      console.log(distinctLists)

      if (Object.keys(distinctLists).length === 0) {
        lists.push({name: "empty"})
      } else {
        distinctLists[0].lists.map(item => lists.push({name:item}))
      }
      this.items = lists;
      return;
    }
  },
  components: {
    'list': {
      props: ['item'],
      template: `<option :value=item.name>{{ item.name }}</option>`
    }
  },
  template: `
    <div class="container">
      <div class="row justify-content-md-center">
        <div class="form-inline">
          <label for="lists">Choose a list:</label>
          <select name="lists" id="lists" @change="onChange($event)" v-model="selection" class="form-control">
            <list v-for="item in items" v-bind:item="item" v-bind:key="item.id"></list>
          </select>
        </div>
        <div v-on:click="loadList">
          <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
            <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
            <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
          </svg>
        </div>
        <div class="mx-sm-3">
        <button v-on:click="exporttocsv" class="btn btn-primary float-right">Export To CSV</button>
      </div>
      </div>
    </div>`
})

const vm = app.mount('#app')


function def(string) {
  if (string) {
    
    let clean = '"' + string + '"'

    //replace potential commas with semicolon to not break csv file -> seem unnecessary when adding double quotes above
    /*
    let nocomma = string.replace(/,/g, ";");
    let clean = nocomma.replace(/\n/g, "\\n");
    */
    return clean;
  } else {
    return "";
  }
}


function tocsv(leads) {

  const rows = [
    "_id" + "," +
    "List" + "," +
    "Account" + "," +
    "FirstName" + "," +
    "LastName" + "," +
    "Role" + "," +
    "Region" + "," +
    "LinkedIn" + "," +
    "CRMLink" + "," +
    "Notes" + ","
  ]

  leads.map(doc => rows.push(
    def(doc._id) + "," +
    def(doc.List) + "," +
    def(doc.Account) + "," +
    def(doc.FirstName) + "," +
    def(doc.LastName) + "," +
    def(doc.Role) + "," +
    def(doc.Region) + "," +
    def(doc.LinkedIn) + "," +
    def(doc.CRMLink) + "," +
    def(doc.Notes) + ","));

  console.log(rows);

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    + rows.join("\n");

  console.log(csvContent)

  var encodedUri = encodeURI(csvContent);
  window.open(encodedUri);
}

// learning https://www.vuemastery.com/courses/intro-to-vue-3/attribute-binding-vue3