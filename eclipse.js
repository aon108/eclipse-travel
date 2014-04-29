Activity = new Meteor.Collection("activity");
Itinerary = new Meteor.Collection("itinerary");
Category = new Meteor.Collection("category");

Router.map(function () {
  this.route('home', {
    path: '/',
    template: 'appLayout',
    });
  this.route('admin', {
    path: '/admin',
    template: 'admin',
  });
  this.route('addActivity', {
    path: '/activities',
    template: 'addActivity'
  });
  this.route('booked', {
    path: '/booked'
  });
});


if (Meteor.isClient) {
  Session.setDefault("selected_category", "category1");
  Session.setDefault("current_day", 1);

  Planet("appLayout") ({
    helpers: {
      activities: function() {
        var category = Session.get("selected_category");
        return Activity.find({category: category});
      },
      itinItems: function() {
          var thisDay = Session.get("current_day");
          var myItin = Itinerary.findOne({user: Meteor.userId()}, {fields:{activities:1}});
          var dayItins = [];
        if(myItin){
          for(var i=0;i<myItin.activities.length;i++){
            if(myItin.activities[i].day === thisDay){
              dayItins.push(myItin.activities[i]);              
            }        
          }
        }
        return dayItins
      },
      currentDay: function() {
        return Session.get("current_day");
      },
      tripTotal: function() {
        var userItin = Itinerary.findOne({user: Meteor.userId()}, {fields:{activities:1}});
        var total = 0;
        if(userItin){
          for(var i=0;i<userItin.activities.length;i++){
            total = total + userItin.activities[i].price;
          }
        }
        Session.set("trip_total", total);
        return total

      },
      Categories: function() {
        var allCategories = Category.findOne({type: "main"}, {fields:{categories:1}});
        if(allCategories){
        return allCategories.categories
        }
      },

    }
  });

  Template.appLayout.events({
    'click .catPill': function() {
        Meteor.setTimeout(function(){
          var selCat = $('.catPill.active').attr('id');
          Session.set("selected_category", selCat);
        }, 50);        
      },       
      'click .thumbnail': function() {
        Session.set("selected_activity", this._id);
      },
      'click .tripAdd': function() {  
        var userItin = Itinerary.findOne({user: Meteor.userId()}, {fields:{_id:1}});
        Session.set("selected_activity", this._id);
        
          if(!userItin){
            if(Meteor.userId()){
            Itinerary.insert({user: Meteor.userId(), activities: [], booked:false, email:""});
            Session.set("first_login", true);
            } else {
              alert("you have to log in before planning trip");
            }
          } else {
            Session.set("itin_id", userItin._id);
          }

        if(Session.equals("first_login", true)){
          var userItin = Itinerary.findOne({user: Meteor.userId()}, {fields:{_id:1}});
          Session.set("itin_id", userItin._id);
        } 
        var selActivity = Activity.findOne({_id: Session.get("selected_activity")}, {fields:{title:1, price:1}});
        Itinerary.update({_id: Session.get("itin_id")}, {$addToSet: {activities: {day: Session.get("current_day"), _id: Random.id(), title: selActivity.title, price: selActivity.price}}});
        $('#myModal').modal('hide');
      },
      'click .removeItin': function() {        
        var myItin = Itinerary.findOne({user: Meteor.userId()}, {fields:{activities:1}});

        for(var i=0;i<myItin.activities.length;i++){
          if(myItin.activities[i]._id === this._id){
            break
          }
        }

        myItin.activities.splice(i,1);        
        Itinerary.update(Session.get("itin_id"), {$set: {activities: myItin.activities}});
      },
      'click .previous': function(){
        currentDay = Session.get("current_day");
        if( currentDay > 1){
          Session.set("current_day", (currentDay-1));
        }
      },
      'click .next': function() {
        Session.set("current_day", (Session.get("current_day")+1));
      },
      'click #clearTrip': function() {
        var myItin = Itinerary.findOne({user: Meteor.userId()}, {fields:{booked:1}});
        if(!myItin.booked){
          Itinerary.update(Session.get("itin_id"), {$set: {activities: []}});
          Session.set("current_day",1);
        }

      },
      'click #bookItin': function() {
        var myEmail = Meteor.users.findOne(Meteor.userId(), {fields:{emails:1}});
        var tripTotal = Session.get("trip_total");
        Itinerary.update(Session.get("itin_id"), {$set: {booked: true, email: myEmail.emails[0].address, total: tripTotal}});
        Router.go('booked');
      },
      'click #bookedTrips': function() {
        Router.go('admin');
      },
  })

  Planet("admin") ({
    helpers: {
      bookedTrips: function() {
        var bookedItins = Itinerary.find({booked: true});
        return bookedItins
      },
      bookedActivities: function() {
        var bookedItins = Itinerary.findOne(Session.get("selected_btrips"));
        if(bookedItins){
          return bookedItins.activities;
        }
      }
    }
  });

  Template.admin.events({
    'click #booking': function() {
        Router.go('home');
      },
      'click .panel': function() {
        Session.set("selected_btrips", this._id);
      },
      'click #removeBTrip': function() {
        Itinerary.remove(this._id);
      }
  })

  Planet("addActivity") ({
    helpers: {
      Activities: function() {
        return Activity.find({});
      },
      editingActivity: function(){
        var isEdit = Session.get("edit_activity");
        if(isEdit !== 0){
        return Activity.findOne(isEdit);
        } else {
          return {};
        }
      }
    }
  })

  Template.addActivity.events({
    'click .panel': function() {
      Session.set("edit_activity", this._id);
    },
    'click #addActivity': function() {
      Session.set("edit_activity",0);
    },
    'click #submit': function() {
      var inputData = {
        category: $('#inputCategory').val(),
        title: $('#inputTitle').val(),
        price: Number($('#inputPrice').val()),
        description: $('#inputShortDesc').val(),
        details: $('#inputLongDesc').val(),
        images: $('#inputImageURL').val(),
      }

      if(Session.equals("edit_activity",0)){
        Activity.insert(inputData);
      } else {
        Activity.update(Session.get("edit_activity"), inputData);
      }

      var currentActivities = Activity.find().fetch();
      var catID = Category.findOne({type: "main"}, {fields:{_id:1}});
      if(catID){
        Category.update(catID._id, {$set:{categories:[]}});
          for(var j=0;j<currentActivities.length;j++){
            Category.update(catID._id, {$addToSet:{categories: currentActivities[j].category}});
        }
      }
    },
    'click #remove': function(){
      Activity.remove(Session.get("edit_activity"));
    }
  });

  Planet("Modal") ({
    helpers: {
      selActivity: function() {
        return Activity.findOne(Session.get("selected_activity"), {fields:{title:1, price:1, details:1}});
      }
    }
  });

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Itinerary.remove({booked: false});
    
    if (Category.find().count() === 0){
      Category.insert({type: "main", categories: []});
      var currentActivities = Activity.find().fetch();


        for(var j=0;j<currentActivities.length;j++){
          Category.update({type: "main"}, {$addToSet:{categories: currentActivities[j].category}});
        }

    }

    if (Activity.find().count() === 0) {
      var data = [
      {
        category: "category1",
        title: "Activity Title",
        price: 90,
        description: "this is a very short description of the activity",
        details: "these are the full details of the activity",
        images: 'http://placehold.it/250x250',
        tags: ["tag1","tag2"],        
      },
      {
        category: "category1",
        title: "Activity Title",
        price: 80,
        description: "this is a short description of the activity",
        details: "these are the full details of the activity",
        images: 'http://placehold.it/250x250',
        tags: ["tag1","tag2"],        
      },
      {
        category: "category1",
        title: "Activity Title",
        price: 70,
        description: "this is a short description of the activity",
        details: "these are the full details of the activity",
        images: 'http://placehold.it/250x250',
        tags: ["tag1","tag2"],        
      },
      {
        category: "category1",
        title: "Activity Title2",
        price: 90,
        description: "this is a short description of the activity",
        details: "these are the full details of the activity",
        images: 'http://placehold.it/250x250',
        tags: ["tag1","tag2"],        
      },
      {
        category: "category1",
        title: "Activity Title3",
        price: 80,
        description: "this is a short description of the activity",
        details: "these are the full details of the activity",
        images: 'http://placehold.it/250x250',
        tags: ["tag1","tag2"],        
      },
      {
        category: "category1",
        title: "Activity Title4",
        price: 70,
        description: "this is a short description of the activity",
        details: "these are the full details of the activity",
        images: 'http://placehold.it/250x250',
        tags: ["tag1","tag2"],        
      },
      ]

      for (var i=0; i<data.length; i++){
        Activity.insert({
          category: data[i].category,
          title: data[i].title,
          price: data[i].price,
          description: data[i].description,
          details: data[i].details,
          images: data[i].images,
          tags: data[i].tags,
        });
      }
      
    }
  });


}
