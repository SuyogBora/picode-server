import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Career from '@/models/career.model';
import Blog from '@/models/blog.model';
import Inquiry from '@/models/inquiry.model';
import Application from '@/models/application.model';

/**
 * @desc    Get dashboard overview metrics
 * @route   GET /api/dashboard/overview
 * @access  Private/Admin
 */
export const getDashboardOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get counts from all modules
    const [
      totalCareers,
      totalBlogs,
      totalInquiries,
      totalApplications
    ] = await Promise.all([
      Career.countDocuments(),
      Blog.countDocuments(),
      Inquiry.countDocuments(),
      Application.countDocuments()
    ]);

    // Get active/published counts
    const [
      activeCareers,
      publishedBlogs,
      newInquiries
    ] = await Promise.all([
      Career.countDocuments({ status: 'published' }),
      Blog.countDocuments({ status: 'published' }),
      Inquiry.countDocuments({ status: 'new' })
    ]);

    // Calculate growth rates (comparing to previous month)
    const currentDate = new Date();
    const firstDayCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const firstDayTwoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);

    // Get counts for current and previous month
    const [
      currentMonthCareers,
      previousMonthCareers,
      currentMonthBlogs,
      previousMonthBlogs,
      currentMonthInquiries,
      previousMonthInquiries,
      currentMonthApplications,
      previousMonthApplications
    ] = await Promise.all([
      Career.countDocuments({ createdAt: { $gte: firstDayCurrentMonth } }),
      Career.countDocuments({ 
        createdAt: { $gte: firstDayPreviousMonth, $lt: firstDayCurrentMonth } 
      }),
      Blog.countDocuments({ createdAt: { $gte: firstDayCurrentMonth } }),
      Blog.countDocuments({ 
        createdAt: { $gte: firstDayPreviousMonth, $lt: firstDayCurrentMonth } 
      }),
      Inquiry.countDocuments({ createdAt: { $gte: firstDayCurrentMonth } }),
      Inquiry.countDocuments({ 
        createdAt: { $gte: firstDayPreviousMonth, $lt: firstDayCurrentMonth } 
      }),
      Application.countDocuments({ createdAt: { $gte: firstDayCurrentMonth } }),
      Application.countDocuments({ 
        createdAt: { $gte: firstDayPreviousMonth, $lt: firstDayCurrentMonth } 
      })
    ]);

    // Calculate growth rates
    const calculateGrowthRate = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const careerGrowthRate = calculateGrowthRate(currentMonthCareers, previousMonthCareers);
    const blogGrowthRate = calculateGrowthRate(currentMonthBlogs, previousMonthBlogs);
    const inquiryGrowthRate = calculateGrowthRate(currentMonthInquiries, previousMonthInquiries);
    const applicationGrowthRate = calculateGrowthRate(currentMonthApplications, previousMonthApplications);

    res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: {
        kpiCards: {
          careers: {
            total: totalCareers,
            active: activeCareers,
            growth: careerGrowthRate
          },
          blogs: {
            total: totalBlogs,
            published: publishedBlogs,
            growth: blogGrowthRate
          },
          inquiries: {
            total: totalInquiries,
            new: newInquiries,
            growth: inquiryGrowthRate
          },
          applications: {
            total: totalApplications,
            growth: applicationGrowthRate
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get career metrics for dashboard
 * @route   GET /api/dashboard/careers
 * @access  Private/Admin
 */
export const getCareerMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get career metrics with aggregation
    const careerMetrics = await Career.aggregate([
      {
        $facet: {
          // Status distribution
          statusDistribution: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          // Department distribution
          departmentDistribution: [
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],
          // Work mode distribution
          workModeDistribution: [
            { $group: { _id: '$workMode', count: { $sum: 1 } } }
          ],
          // Recent careers
          recentCareers: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { 
              $project: { 
                title: 1, 
                department: 1, 
                status: 1, 
                createdAt: 1,
                applicationsCount: 1
              } 
            }
          ],
          // Monthly trend (last 6 months)
          monthlyTrend: [
            {
              $match: {
                createdAt: { 
                  $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
                }
              }
            },
            {
              $group: {
                _id: { 
                  year: { $year: '$createdAt' }, 
                  month: { $month: '$createdAt' } 
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ],
          // Applications per career (top 5)
          topCareers: [
            { $sort: { applicationsCount: -1 } },
            { $limit: 5 },
            { 
              $project: { 
                title: 1, 
                department: 1, 
                applicationsCount: 1 
              } 
            }
          ]
        }
      }
    ]);

    // Format monthly trend data for chart
    const monthlyTrend = careerMetrics[0].monthlyTrend.map((item: any) => {
      const date = new Date(item._id.year, item._id.month - 1, 1);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: item._id.year,
        count: item.count
      };
    });

    res.status(200).json({
      success: true,
      message: 'Career metrics retrieved successfully',
      data: {
        statusDistribution: careerMetrics[0].statusDistribution,
        departmentDistribution: careerMetrics[0].departmentDistribution,
        workModeDistribution: careerMetrics[0].workModeDistribution,
        recentCareers: careerMetrics[0].recentCareers,
        monthlyTrend,
        topCareers: careerMetrics[0].topCareers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get blog metrics for dashboard
 * @route   GET /api/dashboard/blogs
 * @access  Private/Admin
 */
export const getBlogMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get blog metrics with aggregation
    const blogMetrics = await Blog.aggregate([
      {
        $facet: {
          // Status distribution
          statusDistribution: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          // Category distribution
          categoryDistribution: [
            { $unwind: '$categories' },
            { $group: { _id: '$categories', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],
          // Popular blogs (by views)
          popularBlogs: [
            { $sort: { views: -1 } },
            { $limit: 5 },
            { 
              $project: { 
                title: 1, 
                views: 1, 
                likes: 1, 
                publishedAt: 1 
              } 
            }
          ],
          // Recent blogs
          recentBlogs: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { 
              $project: { 
                title: 1, 
                status: 1, 
                createdAt: 1,
                author: 1
              } 
            }
          ],
          // Monthly trend (last 6 months)
          monthlyTrend: [
            {
              $match: {
                createdAt: { 
                  $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
                }
              }
            },
            {
              $group: {
                _id: { 
                  year: { $year: '$createdAt' }, 
                  month: { $month: '$createdAt' } 
                },
                count: { $sum: 1 },
                views: { $sum: '$views' },
                likes: { $sum: '$likes' }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ],
          // Total metrics
          totalMetrics: [
            {
              $group: {
                _id: null,
                totalViews: { $sum: '$views' },
                totalLikes: { $sum: '$likes' },
                avgReadingTime: { $avg: '$readingTime' }
              }
            }
          ]
        }
      }
    ]);

    // Format monthly trend data for chart
    const monthlyTrend = blogMetrics[0].monthlyTrend.map((item: any) => {
      const date = new Date(item._id.year, item._id.month - 1, 1);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: item._id.year,
        count: item.count,
        views: item.views,
        likes: item.likes
      };
    });

    // Lookup author information for recent blogs
    const recentBlogs = await Promise.all(
      blogMetrics[0].recentBlogs.map(async (blog: any) => {
        if (blog.author && typeof blog.author === 'object' && blog.author._id) {
          return blog;
        }
        
        if (blog.author) {
          try {
            const User = mongoose.model('User');
            const author = await User.findById(blog.author, 'name email');
            return {
              ...blog,
              author: author || { _id: blog.author, name: 'Unknown' }
            };
          } catch (error) {
            return {
              ...blog,
              author: { _id: blog.author, name: 'Unknown' }
            };
          }
        }
        
        return blog;
      })
    );

    res.status(200).json({
      success: true,
      message: 'Blog metrics retrieved successfully',
      data: {
        statusDistribution: blogMetrics[0].statusDistribution,
        categoryDistribution: blogMetrics[0].categoryDistribution,
        popularBlogs: blogMetrics[0].popularBlogs,
        recentBlogs,
        monthlyTrend,
        totalMetrics: blogMetrics[0].totalMetrics[0] || {
          totalViews: 0,
          totalLikes: 0,
          avgReadingTime: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inquiry metrics for dashboard
 * @route   GET /api/dashboard/inquiries
 * @access  Private/Admin
 */
export const getInquiryMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get inquiry metrics with aggregation
    const inquiryMetrics = await Inquiry.aggregate([
      {
        $facet: {
          // Status distribution
          statusDistribution: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          // Recent inquiries
          recentInquiries: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { 
              $project: { 
                name: 1, 
                email: 1, 
                status: 1, 
                createdAt: 1,
                assignedTo: 1
              } 
            }
          ],
          // Daily trend (last 30 days)
          dailyTrend: [
            {
              $match: {
                createdAt: { 
                  $gte: new Date(new Date().setDate(new Date().getDate() - 30)) 
                }
              }
            },
            {
              $group: {
                _id: { 
                  year: { $year: '$createdAt' }, 
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
          ],
          // Weekly trend (last 12 weeks)
          weeklyTrend: [
            {
              $match: {
                createdAt: { 
                  $gte: new Date(new Date().setDate(new Date().getDate() - 84)) // 12 weeks
                }
              }
            },
            {
              $group: {
                _id: { 
                  year: { $year: '$createdAt' }, 
                  week: { $week: '$createdAt' }
                },
                count: { $sum: 1 },
                firstDay: { $min: '$createdAt' }
              }
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } },
            { $limit: 12 }
          ],
          // Assignment stats
          assignmentStats: [
            {
              $group: {
                _id: { 
                  assigned: { $cond: [{ $ifNull: ['$assignedTo', false] }, true, false] }
                },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // Format daily trend data for chart
    const dailyTrend = inquiryMetrics[0].dailyTrend.map((item: any) => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      return {
        date: date.toISOString().split('T')[0],
        count: item.count
      };
    });

    // Format weekly trend data for chart
    const weeklyTrend = inquiryMetrics[0].weeklyTrend.map((item: any) => {
      return {
        week: `W${item._id.week}`,
        year: item._id.year,
        count: item.count,
        startDate: new Date(item.firstDay).toISOString().split('T')[0]
      };
    });

    // Lookup assignedTo information for recent inquiries
    const recentInquiries = await Promise.all(
      inquiryMetrics[0].recentInquiries.map(async (inquiry: any) => {
        if (inquiry.assignedTo && typeof inquiry.assignedTo === 'object' && inquiry.assignedTo._id) {
          return inquiry;
        }
        
        if (inquiry.assignedTo) {
          try {
            const User = mongoose.model('User');
            const assignedTo = await User.findById(inquiry.assignedTo, 'name email');
            return {
              ...inquiry,
              assignedTo: assignedTo || { _id: inquiry.assignedTo, name: 'Unknown' }
            };
          } catch (error) {
            return {
              ...inquiry,
              assignedTo: { _id: inquiry.assignedTo, name: 'Unknown' }
            };
          }
        }
        
        return inquiry;
      })
    );

    res.status(200).json({
      success: true,
      message: 'Inquiry metrics retrieved successfully',
      data: {
        statusDistribution: inquiryMetrics[0].statusDistribution,
        recentInquiries,
        dailyTrend,
        weeklyTrend,
        assignmentStats: inquiryMetrics[0].assignmentStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get application metrics for dashboard
 * @route   GET /api/dashboard/applications
 * @access  Private/Admin
 */
export const getApplicationMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get application metrics with aggregation
    const applicationMetrics = await Application.aggregate([
      {
        $facet: {
          // Status distribution
          statusDistribution: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          // Recent applications
          recentApplications: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { 
              $project: { 
                name: 1, 
                email: 1, 
                status: 1, 
                createdAt: 1,
                career: 1
              } 
            }
          ],
          // Monthly trend (last 6 months)
          monthlyTrend: [
            {
              $match: {
                createdAt: { 
                  $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
                }
              }
            },
            {
              $group: {
                _id: { 
                  year: { $year: '$createdAt' }, 
                  month: { $month: '$createdAt' } 
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ],
          // Applications per career
          careerDistribution: [
            {
              $group: {
                _id: '$career',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    // Format monthly trend data for chart
    const monthlyTrend = applicationMetrics[0].monthlyTrend.map((item: any) => {
      const date = new Date(item._id.year, item._id.month - 1, 1);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: item._id.year,
        count: item.count
      };
    });

    // Lookup career information for recent applications and career distribution
    const recentApplications = await Promise.all(
      applicationMetrics[0].recentApplications.map(async (application: any) => {
        if (application.career && typeof application.career === 'object' && application.career._id) {
          return application;
        }
        
        if (application.career) {
          try {
            const career = await Career.findById(application.career, 'title department');
            return {
              ...application,
              career: career || { _id: application.career, title: 'Unknown Position' }
            };
          } catch (error) {
            return {
              ...application,
              career: { _id: application.career, title: 'Unknown Position' }
            };
          }
        }
        
        return application;
      })
    );

    const careerDistribution = await Promise.all(
      applicationMetrics[0].careerDistribution.map(async (item: any) => {
        try {
          const career = await Career.findById(item._id, 'title department');
          return {
            _id: item._id,
            title: career ? career.title : 'Unknown Position',
            department: career ? career.department : 'Unknown',
            count: item.count
          };
        } catch (error) {
          return {
            _id: item._id,
            title: 'Unknown Position',
            department: 'Unknown',
            count: item.count
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      message: 'Application metrics retrieved successfully',
      data: {
        statusDistribution: applicationMetrics[0].statusDistribution,
        recentApplications,
        monthlyTrend,
        careerDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get time-based activity metrics for dashboard
 * @route   GET /api/dashboard/activity
 * @access  Private/Admin
 */
export const getActivityMetrics = async (
  req: Request<{}, {}, {}, { period?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { period = 'week' } = req.query;
    
    // Determine date range based on period
    let startDate: Date;
    const endDate = new Date();
    const timeFormat: string = period === 'day' ? 'hour' : period === 'week' ? 'day' : 'day';
    
    if (period === 'day') {
      startDate = new Date(endDate);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30); // Default to 30 days
    }

    // Create time slots for the period
    const timeSlots: Date[] = [];
    if (period === 'day') {
      // For day, create hourly slots
      for (let i = 0; i <= 23; i++) {
        const slot = new Date(endDate);
        slot.setHours(i, 0, 0, 0);
        timeSlots.push(slot);
      }
    } else if (period === 'week') {
      // For week, create daily slots
      for (let i = 6; i >= 0; i--) {
        const slot = new Date(endDate);
        slot.setDate(slot.getDate() - i);
        slot.setHours(0, 0, 0, 0);
        timeSlots.push(slot);
      }
    } else {
      // For month, create daily slots
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = days - 1; i >= 0; i--) {
        const slot = new Date(endDate);
        slot.setDate(slot.getDate() - i);
        slot.setHours(0, 0, 0, 0);
        timeSlots.push(slot);
      }
    }

    // Create match stages for each model
    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Group stage for each model
    const createGroupStage = () => {
      if (period === 'day') {
        return {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        };
      } else {
        return {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        };
      }
    };

    // Run aggregations for each model
    const [
      careerActivity,
      blogActivity,
      inquiryActivity,
      applicationActivity
    ] = await Promise.all([
      Career.aggregate([
        { $match: matchStage },
        { $group: createGroupStage() },
        { $sort: { _id: 1 } }
      ]),
      Blog.aggregate([
        { $match: matchStage },
        { $group: createGroupStage() },
        { $sort: { _id: 1 } }
      ]),
      Inquiry.aggregate([
        { $match: matchStage },
        { $group: createGroupStage() },
        { $sort: { _id: 1 } }
      ]),
      Application.aggregate([
        { $match: matchStage },
        { $group: createGroupStage() },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format the results
    const formatActivityData = (activityData: any[]) => {
      const formattedData: Record<string, number> = {};
      
      // Initialize all slots with 0
      timeSlots.forEach(slot => {
        let key: string;
        if (period === 'day') {
          key = slot.getHours().toString().padStart(2, '0');
        } else {
          key = slot.toISOString().split('T')[0];
        }
        formattedData[key] = 0;
      });
      
      // Fill in actual data
      activityData.forEach(item => {
        let key: string;
        if (period === 'day') {
          key = item._id.toString().padStart(2, '0');
        } else {
          const date = new Date(item._id.year, item._id.month - 1, item._id.day);
          key = date.toISOString().split('T')[0];
        }
        formattedData[key] = item.count;
      });
      
      return formattedData;
    };

    const formattedCareerActivity = formatActivityData(careerActivity);
    const formattedBlogActivity = formatActivityData(blogActivity);
    const formattedInquiryActivity = formatActivityData(inquiryActivity);
    const formattedApplicationActivity = formatActivityData(applicationActivity);

    // Prepare chart data
    const chartLabels = Object.keys(formattedCareerActivity);
    const chartData = {
      labels: chartLabels,
      datasets: [
        {
          label: 'Careers',
          data: chartLabels.map(label => formattedCareerActivity[label])
        },
        {
          label: 'Blogs',
          data: chartLabels.map(label => formattedBlogActivity[label])
        },
        {
          label: 'Inquiries',
          data: chartLabels.map(label => formattedInquiryActivity[label])
        },
        {
          label: 'Applications',
          data: chartLabels.map(label => formattedApplicationActivity[label])
        }
      ]
    };

    res.status(200).json({
      success: true,
      message: 'Activity metrics retrieved successfully',
      data: {
        period,
        chartData,
        rawData: {
          careers: formattedCareerActivity,
          blogs: formattedBlogActivity,
          inquiries: formattedInquiryActivity,
          applications: formattedApplicationActivity
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
